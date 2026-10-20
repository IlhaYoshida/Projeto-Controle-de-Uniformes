from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
import models
import schemas
from database import get_db
from logger import registrar_log

router = APIRouter(prefix="/estoque", tags=["Estoque"])


def _para_saida(item: models.ItemUniforme) -> schemas.ItemUniformeOut:
    return schemas.ItemUniformeOut(
        id=item.id,
        tipo=item.tipo,
        tamanho=item.tamanho,
        quantidade_estoque=item.quantidade_estoque,
        alerta_saldo_baixo=item.quantidade_estoque < schemas.LIMITE_SALDO_BAIXO,
    )


@router.get("", response_model=list[schemas.ItemUniformeOut])
def painel_estoque(db: Session = Depends(get_db)):
    """
    Painel de estoque por tipo e tamanho (Sprint 3).
    Cada linha já vem com a flag `alerta_saldo_baixo` calculada
    (estoque abaixo de LIMITE_SALDO_BAIXO, hoje = 10 peças).
    """
    itens = db.query(models.ItemUniforme).order_by(models.ItemUniforme.tipo, models.ItemUniforme.tamanho).all()
    return [_para_saida(i) for i in itens]


@router.get("/alertas", response_model=list[schemas.ItemUniformeOut])
def alertas_saldo_baixo(db: Session = Depends(get_db)):
    """ Só os itens com saldo baixo — para o card de alerta do dashboard """
    itens = db.query(models.ItemUniforme).filter(
        models.ItemUniforme.quantidade_estoque < schemas.LIMITE_SALDO_BAIXO
    ).order_by(models.ItemUniforme.quantidade_estoque).all()
    return [_para_saida(i) for i in itens]


@router.get("/resumo-por-tipo")
def resumo_por_tipo(db: Session = Depends(get_db)):
    """ Soma o estoque de todos os tamanhos de cada tipo de peça (útil para um gráfico) """
    resultado = (
        db.query(models.ItemUniforme.tipo, func.sum(models.ItemUniforme.quantidade_estoque).label("total"))
        .group_by(models.ItemUniforme.tipo)
        .all()
    )
    return [{"tipo": tipo, "total_estoque": int(total or 0)} for tipo, total in resultado]


@router.get("/tipos-disponiveis")
def tipos_disponiveis(db: Session = Depends(get_db)):
    """Retorna os tipos de uniforme distintos cadastrados no sistema."""
    tipos = db.query(models.ItemUniforme.tipo).distinct().all()
    return [t[0] for t in tipos]


@router.get("/tamanhos-disponiveis")
def tamanhos_disponiveis(db: Session = Depends(get_db)):
    """Retorna os tamanhos distintos cadastrados no sistema."""
    tamanhos = db.query(models.ItemUniforme.tamanho).distinct().all()
    return [t[0] for t in tamanhos]


@router.post("/item", response_model=schemas.ItemUniformeOut, status_code=201)
def criar_item_uniforme(item: schemas.ItemUniformeCreate, db: Session = Depends(get_db)):
    """Cria um novo tipo de item de uniforme (ex: Meia PP)."""
    existente = db.query(models.ItemUniforme).filter_by(tipo=item.tipo, tamanho=item.tamanho).first()
    if existente:
        raise HTTPException(status_code=409, detail=f"Já existe '{item.tipo}' no tamanho '{item.tamanho}'")

    novo = models.ItemUniforme(tipo=item.tipo, tamanho=item.tamanho, quantidade_estoque=0)
    db.add(novo)
    db.commit()
    db.refresh(novo)
    registrar_log("CRIAR_ITEM_UNIFORME", f"Item '{novo.tipo} {novo.tamanho}' (id={novo.id}) criado")
    return _para_saida(novo)


@router.delete("/item/{item_id}", status_code=204)
def excluir_item_uniforme(item_id: int, db: Session = Depends(get_db)):
    """Remove um tipo de item de uniforme (só se estoque = 0 e sem entregas vinculadas)."""
    item = db.query(models.ItemUniforme).filter(models.ItemUniforme.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item de uniforme não encontrado")

    entregas_vinculadas = db.query(models.ItemEntrega).filter(models.ItemEntrega.item_uniforme_id == item_id).count()
    if entregas_vinculadas:
        raise HTTPException(
            status_code=409,
            detail=f"Não é possível excluir: existem {entregas_vinculadas} entrega(s) vinculada(s) a este item"
        )

    tipo_tam = f"{item.tipo} {item.tamanho}"
    db.delete(item)
    db.commit()
    registrar_log("EXCLUIR_ITEM_UNIFORME", f"Item '{tipo_tam}' (id={item_id}) excluído")
    return None
