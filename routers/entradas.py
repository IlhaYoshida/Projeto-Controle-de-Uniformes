import unicodedata
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models
import schemas
from database import get_db

router = APIRouter(prefix="/entradas", tags=["Entradas de estoque"])


def _sem_acento(texto: str) -> str:
    normalizado = unicodedata.normalize("NFKD", texto)
    return "".join(c for c in normalizado if not unicodedata.combining(c)).lower()


@router.post("", status_code=201)
def registrar_entrada(entrada: schemas.EntradaUniformeCreate, db: Session = Depends(get_db)):
    """ Registra a entrada de novos uniformes (Lote) e atualiza o estoque """
    try:
        # 1. Cria o registro do Lote principal
        novo_lote = models.Lote(
            escola_id=entrada.escola_id,
            usuario_id=entrada.usuario_id,
            nota_fiscal=entrada.nota_fiscal
        )
        db.add(novo_lote)
        db.flush()  # Salva temporariamente para gerar o ID do lote

        # 2. Processa cada item recebido no lote
        for item in entrada.itens:
            # Verifica se o tipo/tamanho já existe no banco
            item_uniforme = db.query(models.ItemUniforme).filter_by(
                tipo=item.tipo,
                tamanho=item.tamanho
            ).first()

            # Se não existir, cadastra a peça no banco com estoque 0
            if not item_uniforme:
                item_uniforme = models.ItemUniforme(
                    tipo=item.tipo,
                    tamanho=item.tamanho,
                    quantidade_estoque=0
                )
                db.add(item_uniforme)
                db.flush()

            # 3. Associa a peça ao Lote que acabou de chegar
            novo_item_lote = models.ItemLote(
                lote_id=novo_lote.id,
                item_uniforme_id=item_uniforme.id,
                quantidade=item.quantidade
            )
            db.add(novo_item_lote)

            # 4. Atualiza o estoque somando a quantidade recebida
            item_uniforme.quantidade_estoque += item.quantidade

        # 5. Confirma todas as inserções no banco
        db.commit()
        return {"message": "Entrada registrada com sucesso!", "lote_id": novo_lote.id}

    except Exception as e:
        db.rollback()  # Em caso de erro, desfaz tudo
        raise HTTPException(status_code=400, detail=f"Erro ao registrar entrada: {str(e)}")


@router.get("", response_model=list[schemas.LoteOut])
def listar_entradas(
    q: str | None = None,
    escola_id: int | None = None,
    ano: int | None = None,
    db: Session = Depends(get_db),
):
    """
    Histórico de entradas (lotes recebidos) — tela 'Entradas' dentro de
    Uniformes no Figma. Filtros opcionais:
      - q: procura por nota fiscal ou nome do responsável (ignora acento)
      - escola_id
      - ano: filtra pelo ano de `data_recebimento`
    """
    query = db.query(models.Lote)
    if escola_id is not None:
        query = query.filter(models.Lote.escola_id == escola_id)
    lotes = query.order_by(models.Lote.data_recebimento.desc()).all()

    if ano is not None:
        lotes = [l for l in lotes if l.data_recebimento and l.data_recebimento.year == ano]

    resultado = []
    for lote in lotes:
        escola = db.query(models.Escola).filter(models.Escola.id == lote.escola_id).first()
        responsavel = db.query(models.Usuario).filter(models.Usuario.id == lote.usuario_id).first()
        itens_lote = db.query(models.ItemLote).filter(models.ItemLote.lote_id == lote.id).all()

        linha = schemas.LoteOut(
            id=lote.id,
            data_recebimento=lote.data_recebimento,
            nota_fiscal=lote.nota_fiscal,
            escola=escola.nome if escola else None,
            responsavel=responsavel.nome if responsavel else None,
            itens=len(itens_lote),
            total_pecas=sum(i.quantidade for i in itens_lote),
        )

        if q:
            alvo = _sem_acento(q)
            campos = _sem_acento(f"{linha.nota_fiscal or ''} {linha.responsavel or ''}")
            if alvo not in campos:
                continue

        resultado.append(linha)

    return resultado
