import unicodedata
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import models
import schemas
from database import get_db
from logger import registrar_log

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

    # `tamanho_camiseta` é coluna real e editável mantida em dia automaticamente
    # a cada entrega registrada. Se por algum motivo estiver em branco, cai de
    # volta pro cálculo a partir do histórico de entregas.
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

    import json
    tamanhos_dict = None
    if aluno.tamanhos_uniforme:
        try:
            tamanhos_dict = json.loads(aluno.tamanhos_uniforme)
        except Exception:
            tamanhos_dict = None

    return schemas.AlunoOut(
        id=aluno.id,
        escola_id=aluno.escola_id,
        turma_id=aluno.turma_id,
        nome=aluno.nome,
        matricula=aluno.matricula,
        data_nascimento=aluno.data_nascimento,
        nome_pai=aluno.nome_pai,
        nome_mae=aluno.nome_mae,
        telefone_pai=aluno.telefone_pai,
        email_pai=aluno.email_pai,
        telefone_mae=aluno.telefone_mae,
        email_mae=aluno.email_mae,
        tamanho_camiseta=aluno.tamanho_camiseta,
        turma=turma.nome if turma else None,
        escola=escola.nome if escola else None,
        idade=_calcular_idade(aluno.data_nascimento),
        tamanho=aluno.tamanho_camiseta or tamanho_derivado or "—",
        tamanhos_uniforme=tamanhos_dict,
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

    registrar_log("LISTAR_ALUNOS", f"Consultou lista de alunos (filtros: nome={nome}, turma_id={turma_id})")
    return [_enriquecer_aluno(a, db) for a in alunos]


@router.get("/{aluno_id}", response_model=schemas.AlunoOut)
def obter_aluno(aluno_id: int, db: Session = Depends(get_db)):
    aluno = db.query(models.Aluno).filter(models.Aluno.id == aluno_id).first()
    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    registrar_log("VISUALIZAR_ALUNO", f"Visualizou aluno '{aluno.nome}' (id={aluno_id})")
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

    import json
    dados = aluno.model_dump()
    if dados.get("tamanhos_uniforme"):
        t_dict = dados["tamanhos_uniforme"]
        dados["tamanhos_uniforme"] = json.dumps(t_dict)
        if not dados.get("tamanho_camiseta") and "Camiseta" in t_dict:
            dados["tamanho_camiseta"] = t_dict["Camiseta"]

    novo_aluno = models.Aluno(**dados)
    db.add(novo_aluno)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Já existe um aluno com essa matrícula")
    db.refresh(novo_aluno)
    registrar_log("CRIAR_ALUNO", f"Aluno '{novo_aluno.nome}' (id={novo_aluno.id}, matrícula={novo_aluno.matricula}) cadastrado")
    return _enriquecer_aluno(novo_aluno, db)


@router.put("/{aluno_id}", response_model=schemas.AlunoOut)
def atualizar_aluno(aluno_id: int, dados: schemas.AlunoUpdate, db: Session = Depends(get_db)):
    """ Atualiza os dados de um aluno já cadastrado """
    import json
    aluno = db.query(models.Aluno).filter(models.Aluno.id == aluno_id).first()
    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    if dados.turma_id is not None:
        turma = db.query(models.Turma).filter(models.Turma.id == dados.turma_id).first()
        if not turma:
            raise HTTPException(status_code=404, detail="Turma informada não existe")

    dump = dados.model_dump(exclude_unset=True)
    if "tamanhos_uniforme" in dump and dump["tamanhos_uniforme"] is not None:
        dump["tamanhos_uniforme"] = json.dumps(dump["tamanhos_uniforme"])
        if not dump.get("tamanho_camiseta") and isinstance(dados.tamanhos_uniforme, dict) and "Camiseta" in dados.tamanhos_uniforme:
            dump["tamanho_camiseta"] = dados.tamanhos_uniforme["Camiseta"]

    for campo, valor in dump.items():
        setattr(aluno, campo, valor)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Já existe um aluno com essa matrícula")
    db.refresh(aluno)
    registrar_log("ATUALIZAR_ALUNO", f"Aluno '{aluno.nome}' (id={aluno_id}) atualizado")
    return _enriquecer_aluno(aluno, db)


@router.delete("/{aluno_id}", status_code=204)
def excluir_aluno(aluno_id: int, db: Session = Depends(get_db)):
    """ Remove um aluno do cadastro """
    aluno = db.query(models.Aluno).filter(models.Aluno.id == aluno_id).first()
    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    nome = aluno.nome
    db.delete(aluno)
    db.commit()
    registrar_log("EXCLUIR_ALUNO", f"Aluno '{nome}' (id={aluno_id}) excluído")
    return None
