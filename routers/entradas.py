import unicodedata
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models
import schemas
from database import get_db
from logger import registrar_log

router = APIRouter(prefix="/entradas", tags=["Entradas de estoque"])


def _sem_acento(texto: str) -> str:
    normalizado = unicodedata.normalize("NFKD", texto)
    return "".join(c for c in normalizado if not unicodedata.combining(c)).lower()


@router.post("", status_code=201)
def registrar_entrada(entrada: schemas.EntradaUniformeCreate, db: Session = Depends(get_db)):
    """ Registra a entrada de novos uniformes (Lote) e atualiza o estoque """
    hoje = date.today()

    # Validação de data: não permitir data futura
    if entrada.data_recebimento and entrada.data_recebimento > hoje:
        raise HTTPException(status_code=400, detail="A data de entrada não pode ser posterior à data atual.")

    # Validação de nota fiscal duplicada: se preenchida, não pode ser repetida
    if entrada.nota_fiscal and entrada.nota_fiscal.strip():
        nf_limpa = entrada.nota_fiscal.strip()
        nf_existente = db.query(models.Lote).filter(
            models.Lote.nota_fiscal.isnot(None),
            models.Lote.nota_fiscal.ilike(nf_limpa),
            models.Lote.escola_id == entrada.escola_id
        ).first()
        if nf_existente:
            raise HTTPException(
                status_code=400,
                detail=f"Já existe uma entrada registrada com a Nota Fiscal '{nf_limpa}' no sistema."
            )

    try:
        data_rec = (
            datetime.combine(entrada.data_recebimento, datetime.min.time())
            if entrada.data_recebimento
            else datetime.now()
        )

        # 1. Cria o registro do Lote principal
        novo_lote = models.Lote(
            escola_id=entrada.escola_id,
            usuario_id=entrada.usuario_id,
            nota_fiscal=entrada.nota_fiscal.strip() if entrada.nota_fiscal else None,
            data_recebimento=data_rec,
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

        data_log_str = data_rec.strftime("%d/%m/%Y")
        usuario = db.query(models.Usuario).filter(models.Usuario.id == entrada.usuario_id).first()
        nome_usuario = usuario.nome if usuario else "Usuário"
        registrar_log(
            "REGISTRAR_ENTRADA",
            f"Lote #{novo_lote.id} recebido na data {data_log_str} com {len(entrada.itens)} item(ns), NF: {novo_lote.nota_fiscal or 'sem NF'}",
            nome_usuario
        )
        return {"message": "Entrada registrada com sucesso!", "lote_id": novo_lote.id}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()  # Em caso de erro, desfaz tudo
        raise HTTPException(status_code=400, detail=f"Erro ao registrar entrada: {str(e)}")


@router.get("/{lote_id}/detalhes", response_model=schemas.LoteDetalhadoOut)
def obter_detalhes_lote(lote_id: int, db: Session = Depends(get_db)):
    """Retorna os dados detalhados de um lote e todos os itens que foram recebidos nele."""
    lote = db.query(models.Lote).filter(models.Lote.id == lote_id).first()
    if not lote:
        raise HTTPException(status_code=404, detail="Lote de entrada não encontrado")

    escola = db.query(models.Escola).filter(models.Escola.id == lote.escola_id).first()
    responsavel = db.query(models.Usuario).filter(models.Usuario.id == lote.usuario_id).first()
    itens_lote = db.query(models.ItemLote).filter(models.ItemLote.lote_id == lote.id).all()

    detalhes_itens = []
    total_pecas = 0
    for il in itens_lote:
        peca = db.query(models.ItemUniforme).filter(models.ItemUniforme.id == il.item_uniforme_id).first()
        if peca:
            detalhes_itens.append(schemas.LoteItemDetalhe(
                id=il.id,
                tipo=peca.tipo,
                tamanho=peca.tamanho,
                quantidade=il.quantidade,
            ))
            total_pecas += il.quantidade

    return schemas.LoteDetalhadoOut(
        id=lote.id,
        data_recebimento=lote.data_recebimento,
        nota_fiscal=lote.nota_fiscal,
        escola=escola.nome if escola else None,
        responsavel=responsavel.nome if responsavel else None,
        itens=detalhes_itens,
        total_pecas=total_pecas,
    )


@router.get("", response_model=list[schemas.LoteOut])
def listar_entradas(
    q: str | None = None,
    escola_id: int | None = None,
    ano: int | None = None,
    mes: int | None = None,
    dia: int | None = None,
    db: Session = Depends(get_db),
):
    """
    Histórico de entradas (lotes recebidos) — tela 'Entradas' dentro de Uniformes.
    Filtros opcionais:
      - q: procura por nota fiscal ou nome do responsável (ignora acento)
      - escola_id
      - ano: filtra pelo ano de data_recebimento
      - mes: filtra pelo mês (1 a 12)
      - dia: filtra pelo dia do mês (1 a 31)
    """
    query = db.query(models.Lote)
    if escola_id is not None:
        query = query.filter(models.Lote.escola_id == escola_id)
    lotes = query.order_by(models.Lote.data_recebimento.desc()).all()

    if ano is not None:
        lotes = [l for l in lotes if l.data_recebimento and l.data_recebimento.year == ano]
    if mes is not None:
        lotes = [l for l in lotes if l.data_recebimento and l.data_recebimento.month == mes]
    if dia is not None:
        lotes = [l for l in lotes if l.data_recebimento and l.data_recebimento.day == dia]

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
