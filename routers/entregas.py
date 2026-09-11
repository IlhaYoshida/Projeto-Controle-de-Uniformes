import unicodedata
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models
import schemas
from database import get_db

router = APIRouter(prefix="/entregas", tags=["Entregas"])


def _sem_acento(texto: str) -> str:
    normalizado = unicodedata.normalize("NFKD", texto)
    return "".join(c for c in normalizado if not unicodedata.combining(c)).lower()


def _serializar_entrega(entrega: models.Entrega, db: Session) -> schemas.EntregaOut:
    """ Monta o schema de saída juntando os itens da entrega com tipo/tamanho da peça. """
    itens_db = db.query(models.ItemEntrega).filter(models.ItemEntrega.entrega_id == entrega.id).all()
    itens_out = []
    for item in itens_db:
        peca = db.query(models.ItemUniforme).filter(models.ItemUniforme.id == item.item_uniforme_id).first()
        itens_out.append(schemas.ItemEntregaOut(
            id=item.id,
            item_uniforme_id=item.item_uniforme_id,
            tipo=peca.tipo if peca else None,
            tamanho=peca.tamanho if peca else None,
            quantidade_entregue=item.quantidade_entregue,
        ))
    responsavel = db.query(models.Usuario).filter(models.Usuario.id == entrega.usuario_id).first()
    return schemas.EntregaOut(
        id=entrega.id,
        aluno_id=entrega.aluno_id,
        usuario_id=entrega.usuario_id,
        responsavel=responsavel.nome if responsavel else None,
        data_entrega=entrega.data_entrega,
        itens=itens_out,
    )


@router.post("", response_model=schemas.EntregaOut, status_code=201)
def registrar_entrega(entrega: schemas.EntregaCreate, db: Session = Depends(get_db)):
    """
    Registra a entrega de uniformes a um aluno e debita o estoque.
    Regra de negócio: não deixa entregar mais peças do que existe em estoque.
    """
    aluno = db.query(models.Aluno).filter(models.Aluno.id == entrega.aluno_id).first()
    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    usuario = db.query(models.Usuario).filter(models.Usuario.id == entrega.usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário (responsável pela entrega) não encontrado")

    if not entrega.itens:
        raise HTTPException(status_code=400, detail="A entrega precisa ter pelo menos um item")

    try:
        # 1. Valida estoque de TODOS os itens antes de mexer em qualquer coisa
        pecas = {}
        for item in entrega.itens:
            peca = db.query(models.ItemUniforme).filter(models.ItemUniforme.id == item.item_uniforme_id).first()
            if not peca:
                raise HTTPException(status_code=404, detail=f"Item de uniforme id={item.item_uniforme_id} não existe")
            if peca.quantidade_estoque < item.quantidade_entregue:
                raise HTTPException(
                    status_code=400,
                    detail=f"Estoque insuficiente de {peca.tipo} {peca.tamanho}: "
                           f"disponível {peca.quantidade_estoque}, solicitado {item.quantidade_entregue}"
                )
            pecas[item.item_uniforme_id] = peca

        # 2. Cria a entrega
        nova_entrega = models.Entrega(aluno_id=entrega.aluno_id, usuario_id=entrega.usuario_id)
        db.add(nova_entrega)
        db.flush()

        # 3. Cria cada item da entrega e debita o estoque
        for item in entrega.itens:
            db.add(models.ItemEntrega(
                entrega_id=nova_entrega.id,
                item_uniforme_id=item.item_uniforme_id,
                quantidade_entregue=item.quantidade_entregue,
            ))
            pecas[item.item_uniforme_id].quantidade_estoque -= item.quantidade_entregue

        # 4. Mantém os campos "achatados" do aluno em dia (ver models.Aluno):
        # toda entrega marca o uniforme como Recebido, e se uma camiseta fez
        # parte da entrega, atualiza o tamanho registrado do aluno também.
        aluno.situacao_uniforme = "Recebido"
        for peca in pecas.values():
            if peca.tipo == "Camiseta":
                aluno.tamanho_camiseta = peca.tamanho

        db.commit()
        db.refresh(nova_entrega)
        return _serializar_entrega(nova_entrega, db)

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Erro ao registrar entrega: {str(e)}")


@router.get("/aluno/{aluno_id}", response_model=list[schemas.EntregaOut])
def listar_entregas_do_aluno(aluno_id: int, db: Session = Depends(get_db)):
    """ Histórico de entregas de um aluno específico (usado na tela de detalhes do aluno) """
    entregas = db.query(models.Entrega).filter(models.Entrega.aluno_id == aluno_id).order_by(models.Entrega.data_entrega.desc()).all()
    return [_serializar_entrega(e, db) for e in entregas]


@router.get("", response_model=list[schemas.EntregaResumoOut])
def listar_entregas(
    aluno: str | None = None,
    turma_id: int | None = None,
    ano: int | None = None,
    db: Session = Depends(get_db),
):
    """
    Histórico global de entregas (tela 'Entregas' dentro de Uniformes no
    Figma). Filtros opcionais:
      - aluno: nome ou matrícula do aluno (ignora acento)
      - turma_id
      - ano: filtra pelo ano de `data_entrega`
    """
    query = db.query(models.Entrega)
    entregas = query.order_by(models.Entrega.data_entrega.desc()).all()

    if ano is not None:
        entregas = [e for e in entregas if e.data_entrega and e.data_entrega.year == ano]

    resultado = []
    for entrega in entregas:
        aluno_db = db.query(models.Aluno).filter(models.Aluno.id == entrega.aluno_id).first()
        if not aluno_db:
            continue
        if turma_id is not None and aluno_db.turma_id != turma_id:
            continue
        if aluno:
            alvo = _sem_acento(aluno)
            campos = _sem_acento(f"{aluno_db.nome} {aluno_db.matricula or ''}")
            if alvo not in campos:
                continue

        turma_db = db.query(models.Turma).filter(models.Turma.id == aluno_db.turma_id).first()
        responsavel = db.query(models.Usuario).filter(models.Usuario.id == entrega.usuario_id).first()
        itens = db.query(models.ItemEntrega).filter(models.ItemEntrega.entrega_id == entrega.id).all()

        pecas_desc = []
        total = 0
        for item in itens:
            peca = db.query(models.ItemUniforme).filter(models.ItemUniforme.id == item.item_uniforme_id).first()
            if peca:
                pecas_desc.append(f"{peca.tipo} {peca.tamanho}")
            total += item.quantidade_entregue

        resultado.append(schemas.EntregaResumoOut(
            id=entrega.id,
            data_entrega=entrega.data_entrega,
            aluno_id=entrega.aluno_id,
            aluno=aluno_db.nome,
            turma=turma_db.nome if turma_db else None,
            responsavel=responsavel.nome if responsavel else None,
            pecas=" · ".join(pecas_desc) if pecas_desc else ("Uniforme completo" if len(itens) >= 5 else None),
            quantidade=total,
        ))

    return resultado
