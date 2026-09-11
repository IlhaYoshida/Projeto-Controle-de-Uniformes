from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
import models
import schemas
from database import get_db

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
