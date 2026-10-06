import csv
import io
from datetime import date
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import models
import schemas
from database import get_db

router = APIRouter(prefix="/relatorios", tags=["Relatórios"])


def _montar_relatorio(db: Session) -> list[schemas.RelatorioEntregaTurma]:
    turmas = db.query(models.Turma).all()
    linhas = []

    for turma in turmas:
        alunos = db.query(models.Aluno).filter(models.Aluno.turma_id == turma.id).all()
        aluno_ids = [a.id for a in alunos]

        if aluno_ids:
            entregas = db.query(models.Entrega).filter(models.Entrega.aluno_id.in_(aluno_ids)).all()
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
            serie=turma.serie,
            total_alunos=len(alunos),
            total_alunos_com_entrega=len(alunos_com_entrega),
            total_entregas=len(entregas),
            total_pecas_entregues=total_pecas,
        ))

    return linhas


@router.get("/entregas-por-turma", response_model=list[schemas.RelatorioEntregaTurma])
def relatorio_entregas_por_turma(db: Session = Depends(get_db)):
    """ Relatório de entregas agregado por turma (Sprint 4) """
    return _montar_relatorio(db)


@router.get("/entregas-por-turma/csv")
def relatorio_entregas_por_turma_csv(db: Session = Depends(get_db)):
    """ Mesmo relatório acima, exportado em CSV para prestação de contas """
    linhas = _montar_relatorio(db)

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["turma_id", "serie", "total_alunos", "total_alunos_com_entrega", "total_entregas", "total_pecas_entregues"])
    for linha in linhas:
        writer.writerow([
            linha.turma_id, linha.serie, linha.total_alunos,
            linha.total_alunos_com_entrega, linha.total_entregas, linha.total_pecas_entregues,
        ])
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=relatorio_entregas_por_turma.csv"},
    )


@router.get("/dashboard", response_model=schemas.DashboardOut)
def dashboard(ano: int | None = None, db: Session = Depends(get_db)):
    """
    Visão geral pra tela de Dashboard: cards, gráfico de barras mensal,
    percentual de alunos com uniforme e ranking de quem já recebeu mais de
    uma peça. `ano` é opcional (padrão: ano atual).
    """
    ano = ano or date.today().year

    alunos = db.query(models.Aluno).all()
    total_alunos = len(alunos)
    receberam = sum(1 for a in alunos if a.situacao_uniforme == "Recebido")
    pct = round((receberam / total_alunos) * 100, 1) if total_alunos else 0.0

    pecas_em_estoque = db.query(models.ItemUniforme).all()
    total_estoque = sum(i.quantidade_estoque for i in pecas_em_estoque)

    entregas = db.query(models.Entrega).all()
    entregas_do_ano = [e for e in entregas if e.data_entrega and e.data_entrega.year == ano]

    por_mes = [0] * 12
    pecas_por_aluno: dict[int, int] = {}
    total_pecas_ano = 0

    for entrega in entregas:
        itens = db.query(models.ItemEntrega).filter(models.ItemEntrega.entrega_id == entrega.id).all()
        qtd = sum(i.quantidade_entregue for i in itens)
        pecas_por_aluno[entrega.aluno_id] = pecas_por_aluno.get(entrega.aluno_id, 0) + qtd

        if entrega.data_entrega and entrega.data_entrega.year == ano:
            por_mes[entrega.data_entrega.month - 1] += qtd
            total_pecas_ano += qtd

    ranking = sorted(
        ((aluno_id, qtd) for aluno_id, qtd in pecas_por_aluno.items() if qtd > 1),
        key=lambda x: x[1], reverse=True,
    )[:5]

    mais_de_um = []
    for aluno_id, qtd in ranking:
        aluno = db.query(models.Aluno).filter(models.Aluno.id == aluno_id).first()
        if aluno:
            mais_de_um.append(schemas.RankingAluno(aluno_id=aluno_id, nome=aluno.nome, pecas=qtd))

    return schemas.DashboardOut(
        ano=ano,
        alunos_cadastrados=total_alunos,
        receberam_uniforme=receberam,
        pct_receberam_uniforme=pct,
        pecas_recebidas_no_ano=total_pecas_ano,
        pecas_em_estoque=total_estoque,
        uniformes_por_mes=por_mes,
        mais_de_um_uniforme=mais_de_um,
    )
