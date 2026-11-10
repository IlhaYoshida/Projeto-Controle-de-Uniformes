import csv
import io
from datetime import date, datetime
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import letter, landscape
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
import models
import schemas
from database import get_db

router = APIRouter(prefix="/relatorios", tags=["Relatórios"])


def _montar_relatorio(db: Session, ano: int | None = None, mes: int | None = None) -> list[schemas.RelatorioEntregaTurma]:
    turmas = db.query(models.Turma).order_by(models.Turma.nome).all()
    linhas = []

    for turma in turmas:
        alunos = db.query(models.Aluno).filter(models.Aluno.turma_id == turma.id).all()
        aluno_ids = [a.id for a in alunos]

        if aluno_ids:
            query_entregas = db.query(models.Entrega).filter(models.Entrega.aluno_id.in_(aluno_ids))
            if ano:
                query_entregas = query_entregas.filter(models.Entrega.data_entrega.isnot(None))
            entregas = query_entregas.all()
            if ano:
                entregas = [e for e in entregas if e.data_entrega and e.data_entrega.year == ano]
            if mes:
                entregas = [e for e in entregas if e.data_entrega and e.data_entrega.month == mes]
        else:
            entregas = []

        entrega_ids = [e.id for e in entregas]
        total_pecas = 0
        if entrega_ids:
            itens = db.query(models.ItemEntrega).filter(models.ItemEntrega.entrega_id.in_(entrega_ids)).all()
            total_pecas = sum(i.quantidade_entregue for i in itens)

        alunos_com_entrega = {e.aluno_id for e in entregas}

        linhas.append(schemas.RelatorioEntregaTurma(
            turma_id=turma.id,
            turma_nome=turma.nome,
            total_alunos=len(alunos),
            total_alunos_com_entrega=len(alunos_com_entrega),
            total_entregas=len(entregas),
            total_pecas_entregues=total_pecas,
        ))

    return linhas


@router.get("/entregas-por-turma", response_model=list[schemas.RelatorioEntregaTurma])
def relatorio_entregas_por_turma(ano: int | None = None, mes: int | None = None, db: Session = Depends(get_db)):
    """ Relatório de entregas agregado por turma com filtro opcional de ano e mês """
    return _montar_relatorio(db, ano=ano, mes=mes)


@router.get("/entregas-por-turma/csv")
def relatorio_entregas_por_turma_csv(ano: int | None = None, mes: int | None = None, db: Session = Depends(get_db)):
    """ Mesmo relatório acima, exportado em CSV para prestação de contas """
    linhas = _montar_relatorio(db, ano=ano, mes=mes)

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["turma_id", "turma_nome", "total_alunos", "total_alunos_com_entrega", "total_entregas", "total_pecas_entregues"])
    for linha in linhas:
        writer.writerow([
            linha.turma_id, linha.turma_nome, linha.total_alunos,
            linha.total_alunos_com_entrega, linha.total_entregas, linha.total_pecas_entregues,
        ])
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=relatorio_entregas_por_turma.csv"},
    )


@router.get("/movimentacoes/pdf")
def exportar_movimentacoes_pdf(
    data_inicio: date | None = None,
    data_fim: date | None = None,
    usuario_id: int | None = None,
    tipo_movimento: str | None = Query("todos", description="'todos', 'entradas' ou 'saidas'"),
    db: Session = Depends(get_db),
):
    """
    Gera relatório executivo em PDF de todas as entradas e saídas de uniformes
    com filtros opcionais por intervalo de datas, usuário responsável e tipo.
    """
    movimentacoes = []

    # 1. Coleta Entradas (Lotes)
    if tipo_movimento in ("todos", "entradas"):
        q_lotes = db.query(models.Lote)
        if usuario_id:
            q_lotes = q_lotes.filter(models.Lote.usuario_id == usuario_id)
        lotes = q_lotes.order_by(models.Lote.data_recebimento.asc()).all()

        for lote in lotes:
            d_lote = lote.data_recebimento.date() if lote.data_recebimento else None
            if data_inicio and d_lote and d_lote < data_inicio:
                continue
            if data_fim and d_lote and d_lote > data_fim:
                continue

            resp = db.query(models.Usuario).filter(models.Usuario.id == lote.usuario_id).first()
            itens = db.query(models.ItemLote).filter(models.ItemLote.lote_id == lote.id).all()
            for il in itens:
                peca = db.query(models.ItemUniforme).filter(models.ItemUniforme.id == il.item_uniforme_id).first()
                movimentacoes.append({
                    "data": lote.data_recebimento,
                    "tipo": "Entrada",
                    "detalhe": f"NF: {lote.nota_fiscal or 'S/N'}",
                    "peca": f"{peca.tipo} ({peca.tamanho})" if peca else "—",
                    "quantidade": il.quantidade,
                    "responsavel": resp.nome if resp else "—",
                })

    # 2. Coleta Saídas (Entregas aos Alunos)
    if tipo_movimento in ("todos", "saidas"):
        q_entregas = db.query(models.Entrega)
        if usuario_id:
            q_entregas = q_entregas.filter(models.Entrega.usuario_id == usuario_id)
        entregas = q_entregas.order_by(models.Entrega.data_entrega.asc()).all()

        for entrega in entregas:
            d_entrega = entrega.data_entrega.date() if entrega.data_entrega else None
            if data_inicio and d_entrega and d_entrega < data_inicio:
                continue
            if data_fim and d_entrega and d_entrega > data_fim:
                continue

            aluno = db.query(models.Aluno).filter(models.Aluno.id == entrega.aluno_id).first()
            resp = db.query(models.Usuario).filter(models.Usuario.id == entrega.usuario_id).first()
            itens = db.query(models.ItemEntrega).filter(models.ItemEntrega.entrega_id == entrega.id).all()
            for ie in itens:
                peca = db.query(models.ItemUniforme).filter(models.ItemUniforme.id == ie.item_uniforme_id).first()
                movimentacoes.append({
                    "data": entrega.data_entrega,
                    "tipo": "Saída",
                    "detalhe": f"Aluno: {aluno.nome if aluno else '—'}",
                    "peca": f"{peca.tipo} ({peca.tamanho})" if peca else "—",
                    "quantidade": ie.quantidade_entregue,
                    "responsavel": resp.nome if resp else "—",
                })

    # Ordena cronologicamente
    movimentacoes.sort(key=lambda x: x["data"] or datetime.min)

    # 3. Monta documento PDF com ReportLab
    pdf_buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        pdf_buffer,
        pagesize=landscape(letter),
        leftMargin=30,
        rightMargin=30,
        topMargin=30,
        bottomMargin=30,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "Titulo",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#1e293b"),
    )
    subtitle_style = ParagraphStyle(
        "Subtitulo",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#64748b"),
    )
    cell_style = ParagraphStyle(
        "Celula",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#334155"),
    )
    cell_header_style = ParagraphStyle(
        "CelulaCabecalho",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=11,
        textColor=colors.white,
    )

    elementos = []
    elementos.append(Paragraph("Uniforme Plus · Relatório Geral de Movimentações", title_style))
    data_emissao = datetime.now().strftime("%d/%m/%Y às %H:%M")
    filtros_texto = f"Tipo: {tipo_movimento.capitalize()} | Período: {data_inicio.strftime('%d/%m/%Y') if data_inicio else 'Início'} até {data_fim.strftime('%d/%m/%Y') if data_fim else 'Atual'} | Emitido em: {data_emissao}"
    elementos.append(Paragraph(filtros_texto, subtitle_style))
    elementos.append(Spacer(1, 15))

    # Tabela
    cabecalhos = [
        Paragraph("Data / Hora", cell_header_style),
        Paragraph("Tipo", cell_header_style),
        Paragraph("Referência / Destinatário", cell_header_style),
        Paragraph("Uniforme (Tamanho)", cell_header_style),
        Paragraph("Qtd", cell_header_style),
        Paragraph("Responsável", cell_header_style),
    ]
    dados_tabela = [cabecalhos]

    total_entradas_pecas = 0
    total_saidas_pecas = 0

    for m in movimentacoes:
        dt_str = m["data"].strftime("%d/%m/%Y %H:%M") if m["data"] else "—"
        if m["tipo"] == "Entrada":
            total_entradas_pecas += m["quantidade"]
            tipo_cor = "<b><font color='#2563eb'>ENTRADA</font></b>"
        else:
            total_saidas_pecas += m["quantidade"]
            tipo_cor = "<b><font color='#059669'>SAÍDA</font></b>"

        dados_tabela.append([
            Paragraph(dt_str, cell_style),
            Paragraph(tipo_cor, cell_style),
            Paragraph(m["detalhe"], cell_style),
            Paragraph(m["peca"], cell_style),
            Paragraph(str(m["quantidade"]), cell_style),
            Paragraph(m["responsavel"], cell_style),
        ])

    if len(dados_tabela) == 1:
        dados_tabela.append([
            Paragraph("Nenhuma movimentação encontrada para os filtros selecionados.", cell_style),
            Paragraph("", cell_style), Paragraph("", cell_style), Paragraph("", cell_style), Paragraph("", cell_style), Paragraph("", cell_style)
        ])

    tabela = Table(dados_tabela, colWidths=[90, 60, 260, 140, 45, 125])
    tabela.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a8a")),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#ffffff"), colors.HexColor("#f8fafc")]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
    ]))
    elementos.append(tabela)
    elementos.append(Spacer(1, 15))

    resumo_texto = f"<b>Total de Entradas:</b> {total_entradas_pecas} peça(s) | <b>Total de Saídas:</b> {total_saidas_pecas} peça(s) | <b>Saldo do Período:</b> {total_entradas_pecas - total_saidas_pecas} peça(s)"
    elementos.append(Paragraph(resumo_texto, subtitle_style))

    doc.build(elementos)
    pdf_buffer.seek(0)

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=relatorio_movimentacoes_uniforme_plus.pdf"},
    )


@router.get("/completo", response_model=schemas.RelatorioCompleto)
def relatorio_completo(ano: int | None = None, mes: int | None = None, db: Session = Depends(get_db)):
    """Relatório completo com dados de todas as turmas e resumo mensal por ano e mês."""
    ano = ano or date.today().year
    turmas_rel = _montar_relatorio(db, ano=ano, mes=mes)

    alunos = db.query(models.Aluno).all()
    total_alunos = len(alunos)

    # Entregas filtradas pelo período
    q_entregas_totais = db.query(models.Entrega).filter(models.Entrega.data_entrega.isnot(None))
    entregas_periodo = [e for e in q_entregas_totais.all() if e.data_entrega.year == ano]
    if mes:
        entregas_periodo = [e for e in entregas_periodo if e.data_entrega.month == mes]

    alunos_com_entrega_ids = {e.aluno_id for e in entregas_periodo}
    receberam = sum(1 for a in alunos if a.id in alunos_com_entrega_ids)
    pct = round((receberam / total_alunos) * 100, 1) if total_alunos else 0.0

    pecas_em_estoque = db.query(models.ItemUniforme).all()
    total_estoque = sum(i.quantidade_estoque for i in pecas_em_estoque)

    # Entradas do ano
    lotes = db.query(models.Lote).all()
    total_entradas_ano = 0
    entradas_mes = [0] * 12
    for lote in lotes:
        if lote.data_recebimento and lote.data_recebimento.year == ano:
            itens_lote = db.query(models.ItemLote).filter(models.ItemLote.lote_id == lote.id).all()
            qtd = sum(i.quantidade for i in itens_lote)
            if not mes or lote.data_recebimento.month == mes:
                total_entradas_ano += qtd
            entradas_mes[lote.data_recebimento.month - 1] += qtd

    # Entregas / saídas do ano
    entregas = db.query(models.Entrega).all()
    saidas_mes = [0] * 12
    entregas_count_mes = [0] * 12
    total_pecas_entregues = 0
    for entrega in entregas:
        itens = db.query(models.ItemEntrega).filter(models.ItemEntrega.entrega_id == entrega.id).all()
        qtd = sum(i.quantidade_entregue for i in itens)
        if entrega.data_entrega and entrega.data_entrega.year == ano:
            if not mes or entrega.data_entrega.month == mes:
                total_pecas_entregues += qtd
            saidas_mes[entrega.data_entrega.month - 1] += qtd
            entregas_count_mes[entrega.data_entrega.month - 1] += 1

    nomes_meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
    meses_rel = [
        schemas.RelatorioMensal(
            mes=m + 1,
            nome_mes=nomes_meses[m],
            entradas_pecas=entradas_mes[m],
            saidas_pecas=saidas_mes[m],
            entregas_realizadas=entregas_count_mes[m]
        )
        for m in range(12)
    ]

    return schemas.RelatorioCompleto(
        ano=ano,
        total_alunos=total_alunos,
        total_alunos_com_entrega=receberam,
        pct_alunos_com_entrega=pct,
        total_pecas_entregues=total_pecas_entregues,
        total_pecas_em_estoque=total_estoque,
        total_entradas_ano=total_entradas_ano,
        turmas=turmas_rel,
        meses=meses_rel
    )


@router.get("/dashboard", response_model=schemas.DashboardOut)
def dashboard(ano: int | None = None, mes: int | None = None, db: Session = Depends(get_db)):
    """
    Visão geral para tela de Dashboard:
    - Indicadores calculados estritamente pelo ano e mês selecionados (Item 4 e 5).
    - Lista de registros de saída recentes (Item 20).
    """
    ano = ano or date.today().year

    alunos = db.query(models.Aluno).all()
    total_alunos = len(alunos)

    # Entregas filtradas pelo período selecionado
    todas_entregas = db.query(models.Entrega).filter(models.Entrega.data_entrega.isnot(None)).all()
    entregas_periodo = [e for e in todas_entregas if e.data_entrega.year == ano]
    if mes:
        entregas_periodo = [e for e in entregas_periodo if e.data_entrega.month == mes]

    alunos_com_entrega_ids = {e.aluno_id for e in entregas_periodo}
    receberam = sum(1 for a in alunos if a.id in alunos_com_entrega_ids)
    pct = round((receberam / total_alunos) * 100, 1) if total_alunos else 0.0

    pecas_em_estoque = db.query(models.ItemUniforme).all()
    total_estoque = sum(i.quantidade_estoque for i in pecas_em_estoque)

    # Gráfico de barras mensal (distribuição no ano)
    por_mes = [0] * 12
    pecas_por_aluno: dict[int, int] = {}
    total_pecas_periodo = 0

    for entrega in todas_entregas:
        if entrega.data_entrega.year == ano:
            itens = db.query(models.ItemEntrega).filter(models.ItemEntrega.entrega_id == entrega.id).all()
            qtd = sum(i.quantidade_entregue for i in itens)
            por_mes[entrega.data_entrega.month - 1] += qtd

            if not mes or entrega.data_entrega.month == mes:
                total_pecas_periodo += qtd
                pecas_por_aluno[entrega.aluno_id] = pecas_por_aluno.get(entrega.aluno_id, 0) + qtd

    ranking = sorted(
        ((aluno_id, qtd) for aluno_id, qtd in pecas_por_aluno.items() if qtd > 1),
        key=lambda x: x[1], reverse=True,
    )[:5]

    mais_de_um = []
    for aluno_id, qtd in ranking:
        aluno = db.query(models.Aluno).filter(models.Aluno.id == aluno_id).first()
        if aluno:
            mais_de_um.append(schemas.RankingAluno(aluno_id=aluno_id, nome=aluno.nome, pecas=qtd))

    # Saídas recentes para o Dashboard (Item 20)
    # Ordenadas da mais recente para a menos recente
    entregas_ordenadas = sorted(
        entregas_periodo if entregas_periodo else todas_entregas,
        key=lambda e: e.data_entrega or datetime.min,
        reverse=True
    )[:10]

    saidas_recentes = []
    for e in entregas_ordenadas:
        aluno = db.query(models.Aluno).filter(models.Aluno.id == e.aluno_id).first()
        turma = db.query(models.Turma).filter(models.Turma.id == aluno.turma_id).first() if aluno else None
        usuario = db.query(models.Usuario).filter(models.Usuario.id == e.usuario_id).first()
        itens = db.query(models.ItemEntrega).filter(models.ItemEntrega.entrega_id == e.id).all()

        detalhes_pecas = []
        total_qtd = 0
        for it in itens:
            peca = db.query(models.ItemUniforme).filter(models.ItemUniforme.id == it.item_uniforme_id).first()
            if peca:
                detalhes_pecas.append(f"{peca.tipo} ({peca.tamanho})")
            total_qtd += it.quantidade_entregue

        saidas_recentes.append(schemas.EntregaResumoOut(
            id=e.id,
            data_entrega=e.data_entrega,
            aluno_id=e.aluno_id,
            aluno=aluno.nome if aluno else "Aluno Removido",
            turma=turma.nome if turma else "—",
            responsavel=usuario.nome if usuario else "—",
            pecas=", ".join(detalhes_pecas),
            quantidade=total_qtd,
        ))

    return schemas.DashboardOut(
        ano=ano,
        mes=mes,
        alunos_cadastrados=total_alunos,
        receberam_uniforme=receberam,
        pct_receberam_uniforme=pct,
        pecas_recebidas_no_ano=total_pecas_periodo,
        pecas_em_estoque=total_estoque,
        uniformes_por_mes=por_mes,
        mais_de_um_uniforme=mais_de_um,
        saidas_recentes=saidas_recentes,
    )

