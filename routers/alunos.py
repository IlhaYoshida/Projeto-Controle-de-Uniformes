import unicodedata
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import models
import schemas
from database import get_db

router = APIRouter(prefix="/alunos", tags=["Alunos"])


def _sem_acento(texto: str) -> str:
    """ Remove acentos e caixa pra permitir busca 'joao' encontrar 'João'. """
    normalizado = unicodedata.normalize("NFKD", texto)
    return "".join(c for c in normalizado if not unicodedata.combining(c)).lower()


def _calcular_idade(nascimento) -> int | None:
    if not nascimento:
        return None
    hoje = date.today()
    idade = hoje.year - nascimento.year
    if (hoje.month, hoje.day) < (nascimento.month, nascimento.day):
        idade -= 1
    return idade


def _enriquecer_aluno(aluno: models.Aluno, db: Session) -> schemas.AlunoOut:
    """
    Monta o AlunoOut juntando dados de outras tabelas (turma, escola,
    histórico de entregas), sem duplicar essa informação na tabela `alunos`.
    """
    turma = db.query(models.Turma).filter(models.Turma.id == aluno.turma_id).first()
    escola = db.query(models.Escola).filter(models.Escola.id == aluno.escola_id).first()

    entregas = (
        db.query(models.Entrega)
        .filter(models.Entrega.aluno_id == aluno.id)
        .order_by(models.Entrega.data_entrega.desc())
        .all()
    )

    # `tamanho_camiseta` e `situacao_uniforme` são colunas reais e editáveis
    # (ver models.Aluno), mantidas em dia automaticamente a cada entrega
    # registrada. Se por algum motivo estiverem em branco (aluno antigo,
    # importado sem esse campo), cai de volta pro cálculo a partir do
    # histórico de entregas, pra nunca aparecer vazio na tela.
    tamanho_derivado = None
    for entrega in entregas:
        itens = db.query(models.ItemEntrega).filter(models.ItemEntrega.entrega_id == entrega.id).all()
        for item in itens:
            peca = db.query(models.ItemUniforme).filter(models.ItemUniforme.id == item.item_uniforme_id).first()
            if peca and peca.tipo == "Camiseta":
                tamanho_derivado = peca.tamanho
                break
        if tamanho_derivado:
            break

    return schemas.AlunoOut(
        id=aluno.id,
        escola_id=aluno.escola_id,
        turma_id=aluno.turma_id,
        nome=aluno.nome,
        matricula=aluno.matricula,
        data_nascimento=aluno.data_nascimento,
        nome_pai=aluno.nome_pai,
        nome_mae=aluno.nome_mae,
        tamanho_camiseta=aluno.tamanho_camiseta,
        situacao_uniforme=aluno.situacao_uniforme,
        turma=turma.nome if turma else None,
        escola=escola.nome if escola else None,
        idade=_calcular_idade(aluno.data_nascimento),
        tamanho=aluno.tamanho_camiseta or tamanho_derivado or "—",
        status=aluno.situacao_uniforme or ("Recebido" if entregas else "Pendente"),
        recebidos=len(entregas),
    )


@router.get("", response_model=list[schemas.AlunoOut])
def listar_alunos(
    nome: str | None = None,
    turma_id: int | None = None,
    db: Session = Depends(get_db),
):
    """
    Retorna a lista de alunos (História de Usuário: Pesquisa).
    Aceita filtros opcionais: ?nome=joao&turma_id=1
    A busca por nome ignora acentos e maiúsculas/minúsculas.
    """
    query = db.query(models.Aluno)
    if turma_id is not None:
        query = query.filter(models.Aluno.turma_id == turma_id)

    alunos = query.all()

    if nome:
        alvo = _sem_acento(nome)
        alunos = [a for a in alunos if alvo in _sem_acento(a.nome)]

    return [_enriquecer_aluno(a, db) for a in alunos]


@router.get("/{aluno_id}", response_model=schemas.AlunoOut)
def obter_aluno(aluno_id: int, db: Session = Depends(get_db)):
    aluno = db.query(models.Aluno).filter(models.Aluno.id == aluno_id).first()
    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    return _enriquecer_aluno(aluno, db)


@router.post("", response_model=schemas.AlunoOut, status_code=201)
def criar_aluno(aluno: schemas.AlunoCreate, db: Session = Depends(get_db)):
    """ Cadastra um novo aluno """
    escola = db.query(models.Escola).filter(models.Escola.id == aluno.escola_id).first()
    if not escola:
        raise HTTPException(status_code=404, detail="Escola informada não existe")

    turma = db.query(models.Turma).filter(models.Turma.id == aluno.turma_id).first()
    if not turma:
        raise HTTPException(status_code=404, detail="Turma informada não existe")

    dados = aluno.model_dump()
    dados["situacao_uniforme"] = dados.get("situacao_uniforme") or "Pendente"
    novo_aluno = models.Aluno(**dados)
    db.add(novo_aluno)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Já existe um aluno com essa matrícula")
    db.refresh(novo_aluno)
    return _enriquecer_aluno(novo_aluno, db)


@router.put("/{aluno_id}", response_model=schemas.AlunoOut)
def atualizar_aluno(aluno_id: int, dados: schemas.AlunoUpdate, db: Session = Depends(get_db)):
    """ Atualiza os dados de um aluno já cadastrado """
    aluno = db.query(models.Aluno).filter(models.Aluno.id == aluno_id).first()
    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    if dados.turma_id is not None:
        turma = db.query(models.Turma).filter(models.Turma.id == dados.turma_id).first()
        if not turma:
            raise HTTPException(status_code=404, detail="Turma informada não existe")

    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(aluno, campo, valor)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Já existe um aluno com essa matrícula")
    db.refresh(aluno)
    return _enriquecer_aluno(aluno, db)


@router.delete("/{aluno_id}", status_code=204)
def excluir_aluno(aluno_id: int, db: Session = Depends(get_db)):
    """ Remove um aluno do cadastro """
    aluno = db.query(models.Aluno).filter(models.Aluno.id == aluno_id).first()
    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    db.delete(aluno)
    db.commit()
    return None
