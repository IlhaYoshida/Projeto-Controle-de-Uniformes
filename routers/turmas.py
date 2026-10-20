import re
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models
import schemas
from database import get_db
from logger import registrar_log

router = APIRouter(prefix="/turmas", tags=["Turmas"])


def _extrair_serie(nome: str) -> int | None:
    """Extrai o número da série a partir do nome da turma (ex: '5º A' → 5)."""
    match = re.search(r'(\d+)', nome)
    return int(match.group(1)) if match else None


@router.post("", response_model=schemas.TurmaOut, status_code=201)
def criar_turma(turma: schemas.TurmaCreate, db: Session = Depends(get_db)):
    """ Cadastra uma nova turma (ex: nome="5º A") vinculada a uma escola """
    escola = db.query(models.Escola).filter(models.Escola.id == turma.escola_id).first()
    if not escola:
        raise HTTPException(status_code=404, detail="Escola informada não existe")

    # Verifica duplicata (mesma escola + mesmo nome)
    existente = db.query(models.Turma).filter(
        models.Turma.escola_id == turma.escola_id,
        models.Turma.nome == turma.nome,
    ).first()
    if existente:
        raise HTTPException(status_code=409, detail=f"Já existe uma turma '{turma.nome}' nesta escola")

    serie = _extrair_serie(turma.nome)
    nova_turma = models.Turma(
        escola_id=turma.escola_id,
        serie=serie,
        nome=turma.nome,
    )
    db.add(nova_turma)
    db.commit()
    db.refresh(nova_turma)
    registrar_log("CRIAR_TURMA", f"Turma '{nova_turma.nome}' (id={nova_turma.id}) criada")
    return nova_turma


@router.get("", response_model=list[schemas.TurmaOut])
def listar_turmas(escola_id: int | None = None, db: Session = Depends(get_db)):
    """ Lista turmas, opcionalmente filtrando por escola """
    query = db.query(models.Turma)
    if escola_id is not None:
        query = query.filter(models.Turma.escola_id == escola_id)
    return query.order_by(models.Turma.nome).all()


@router.get("/{turma_id}", response_model=schemas.TurmaOut)
def obter_turma(turma_id: int, db: Session = Depends(get_db)):
    """ Retorna uma turma específica """
    turma = db.query(models.Turma).filter(models.Turma.id == turma_id).first()
    if not turma:
        raise HTTPException(status_code=404, detail="Turma não encontrada")
    return turma


@router.put("/{turma_id}", response_model=schemas.TurmaOut)
def atualizar_turma(turma_id: int, dados: schemas.TurmaUpdate, db: Session = Depends(get_db)):
    """ Atualiza o nome de uma turma """
    turma = db.query(models.Turma).filter(models.Turma.id == turma_id).first()
    if not turma:
        raise HTTPException(status_code=404, detail="Turma não encontrada")

    if dados.nome is not None:
        # Verifica duplicata
        existente = db.query(models.Turma).filter(
            models.Turma.escola_id == turma.escola_id,
            models.Turma.nome == dados.nome,
            models.Turma.id != turma_id,
        ).first()
        if existente:
            raise HTTPException(status_code=409, detail=f"Já existe uma turma '{dados.nome}' nesta escola")
        turma.nome = dados.nome
        turma.serie = _extrair_serie(dados.nome)

    db.commit()
    db.refresh(turma)
    registrar_log("ATUALIZAR_TURMA", f"Turma '{turma.nome}' (id={turma_id}) atualizada")
    return turma


@router.delete("/{turma_id}", status_code=204)
def excluir_turma(turma_id: int, db: Session = Depends(get_db)):
    """ Remove uma turma (só se não tiver alunos vinculados) """
    turma = db.query(models.Turma).filter(models.Turma.id == turma_id).first()
    if not turma:
        raise HTTPException(status_code=404, detail="Turma não encontrada")

    alunos_vinculados = db.query(models.Aluno).filter(models.Aluno.turma_id == turma_id).count()
    if alunos_vinculados:
        raise HTTPException(
            status_code=409,
            detail=f"Não é possível excluir: existem {alunos_vinculados} aluno(s) vinculado(s) a esta turma"
        )

    nome = turma.nome
    db.delete(turma)
    db.commit()
    registrar_log("EXCLUIR_TURMA", f"Turma '{nome}' (id={turma_id}) excluída")
    return None


@router.get("/{turma_id}/alunos", response_model=list[schemas.AlunoOut])
def listar_alunos_da_turma(turma_id: int, db: Session = Depends(get_db)):
    """Lista os alunos de uma turma específica."""
    from routers.alunos import _enriquecer_aluno
    turma = db.query(models.Turma).filter(models.Turma.id == turma_id).first()
    if not turma:
        raise HTTPException(status_code=404, detail="Turma não encontrada")
    alunos = db.query(models.Aluno).filter(models.Aluno.turma_id == turma_id).all()
    return [_enriquecer_aluno(a, db) for a in alunos]


@router.get("/{turma_id}/estatisticas")
def estatisticas_turma(turma_id: int, db: Session = Depends(get_db)):
    """Retorna estatísticas de uniformes para uma turma específica."""
    turma = db.query(models.Turma).filter(models.Turma.id == turma_id).first()
    if not turma:
        raise HTTPException(status_code=404, detail="Turma não encontrada")

    alunos = db.query(models.Aluno).filter(models.Aluno.turma_id == turma_id).all()
    aluno_ids = [a.id for a in alunos]

    # Alunos com entrega
    entregas = []
    if aluno_ids:
        entregas = db.query(models.Entrega).filter(models.Entrega.aluno_id.in_(aluno_ids)).all()
    alunos_com_entrega = len({e.aluno_id for e in entregas})

    # Tamanhos de camiseta
    tamanhos_camiseta = {}
    tamanhos_calca = {}
    for aluno in alunos:
        if aluno.tamanho_camiseta:
            tamanhos_camiseta[aluno.tamanho_camiseta] = tamanhos_camiseta.get(aluno.tamanho_camiseta, 0) + 1

    # Peças entregues por tipo
    pecas_por_tipo = {}
    total_pecas = 0
    for entrega in entregas:
        itens = db.query(models.ItemEntrega).filter(models.ItemEntrega.entrega_id == entrega.id).all()
        for item in itens:
            peca = db.query(models.ItemUniforme).filter(models.ItemUniforme.id == item.item_uniforme_id).first()
            if peca:
                chave = peca.tipo
                pecas_por_tipo[chave] = pecas_por_tipo.get(chave, 0) + item.quantidade_entregue
                if peca.tipo == "Calça":
                    tamanhos_calca[peca.tamanho] = tamanhos_calca.get(peca.tamanho, 0) + item.quantidade_entregue
            total_pecas += item.quantidade_entregue

    return {
        "turma_id": turma.id,
        "turma_nome": turma.nome,
        "total_alunos": len(alunos),
        "alunos_com_entrega": alunos_com_entrega,
        "alunos_sem_entrega": len(alunos) - alunos_com_entrega,
        "total_pecas_entregues": total_pecas,
        "tamanhos_camiseta": tamanhos_camiseta,
        "tamanhos_calca": tamanhos_calca,
        "pecas_por_tipo": pecas_por_tipo,
    }
