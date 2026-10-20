import os
import pytest
from logger import LOG_FILE


def test_auth_status_e_setup(client):
    """Testa status inicial e setup da escola com primeiro admin."""
    # 1. Sem dados cadastrados, precisa de setup
    res = client.get("/auth/status-inicial")
    assert res.status_code == 200
    assert res.json()["precisa_setup"] is True

    # 2. Executa setup inicial
    setup_payload = {
        "escola_nome": "Escola Estadual Nova",
        "diretor": "Diretora Cláudia",
        "usuario_nome": "Gestor Ana",
        "usuario_email": "gestor@escola.gov.br",
        "usuario_senha": "senhaSegura123",
        "turmas": ["1º A", "2º A"],
        "uniformes": [{"tipo": "Camiseta", "tamanho": "M"}],
    }
    res_setup = client.post("/auth/setup-inicial", json=setup_payload)
    assert res_setup.status_code == 200
    assert res_setup.json()["usuario"]["email"] == "gestor@escola.gov.br"

    # 3. Agora o status inicial indica que não precisa mais de setup
    res_status = client.get("/auth/status-inicial")
    assert res_status.json()["precisa_setup"] is False
    assert res_status.json()["escola_nome"] == "Escola Estadual Nova"


def test_login_sucesso_e_falha(client, escola_com_usuario):
    """Testa login com credenciais corretas e incorretas (Item 10)."""
    # Login com sucesso
    res = client.post("/auth/login", json={"email": "admin@teste.com", "senha": "admin123"})
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "admin@teste.com"
    assert "senha" not in data  # Não vaza hash de senha

    # Login com senha incorreta
    res_err = client.post("/auth/login", json={"email": "admin@teste.com", "senha": "senhaErrada"})
    assert res_err.status_code == 401


def test_turmas_duplicidade_e_serie(client, escola_com_usuario):
    """Testa unicidade de turmas e extração automática de série (Itens 4 e 12)."""
    escola_id = escola_com_usuario["escola"].id

    # 1. Cria turma 5º A
    res = client.post("/turmas", json={"escola_id": escola_id, "nome": "5º A"})
    assert res.status_code == 201
    turma = res.json()
    assert turma["nome"] == "5º A"
    assert turma["serie"] == 5  # Extraído automaticamente

    # 2. Tentar cadastrar a mesma turma 5º A deve retornar 409 Conflict
    res_dup = client.post("/turmas", json={"escola_id": escola_id, "nome": "5º A"})
    assert res_dup.status_code == 409
    assert "Já existe uma turma" in res_dup.json()["detail"]


def test_alunos_contato_pais_e_matricula_duplicada(client, escola_com_usuario):
    """Testa contatos dos pais (Item 8) e bloqueio de matrícula repetida (Item 1)."""
    escola_id = escola_com_usuario["escola"].id

    # Cria turma
    res_turma = client.post("/turmas", json={"escola_id": escola_id, "nome": "6º B"})
    turma_id = res_turma.json()["id"]

    # 1. Cadastra aluno com dados completos dos pais
    aluno_payload = {
        "escola_id": escola_id,
        "turma_id": turma_id,
        "nome": "Lucas Ferreira",
        "matricula": "20261001",
        "data_nascimento": "2014-05-15",
        "nome_pai": "Carlos Ferreira",
        "telefone_pai": "(11) 98888-7777",
        "email_pai": "carlos@email.com",
        "nome_mae": "Mariana Ferreira",
        "telefone_mae": "(11) 98888-6666",
        "email_mae": "mariana@email.com",
        "tamanho_camiseta": "M",
    }
    res = client.post("/alunos", json=aluno_payload)
    assert res.status_code == 201
    aluno = res.json()
    assert aluno["telefone_pai"] == "(11) 98888-7777"
    assert aluno["email_mae"] == "mariana@email.com"

    # 2. Tentar cadastrar outro aluno com a MESMA matrícula deve ser rejeitado (409)
    aluno_dup = {
        "escola_id": escola_id,
        "turma_id": turma_id,
        "nome": "Outro Aluno",
        "matricula": "20261001",
    }
    res_dup = client.post("/alunos", json=aluno_dup)
    assert res_dup.status_code == 409


def test_uniformes_customizados(client):
    """Testa cadastro e exclusão de novos tipos de uniforme (Item 14)."""
    # 1. Cria nova peça customizada (Meia G)
    res = client.post("/estoque/item", json={"tipo": "Meia", "tamanho": "G"})
    assert res.status_code == 201
    item = res.json()
    assert item["tipo"] == "Meia"
    assert item["tamanho"] == "G"
    item_id = item["id"]

    # 2. Lista tipos disponíveis
    res_tipos = client.get("/estoque/tipos-disponiveis")
    assert res_tipos.status_code == 200
    assert "Meia" in res_tipos.json()

    # 3. Exclui a peça (pois tem estoque 0 e sem entregas)
    res_del = client.delete(f"/estoque/item/{item_id}")
    assert res_del.status_code == 204


def test_fluxo_entrada_e_saida(client, escola_com_usuario):
    """Testa entrada de lote e posterior saída com débito de estoque (Item 11)."""
    escola_id = escola_com_usuario["escola"].id
    usuario_id = escola_com_usuario["usuario"].id

    # 1. Cria peça no estoque
    res_item = client.post("/estoque/item", json={"tipo": "Camiseta", "tamanho": "M"})
    item_id = res_item.json()["id"]

    # 2. Registra entrada de 50 peças
    entrada_payload = {
        "escola_id": escola_id,
        "usuario_id": usuario_id,
        "nota_fiscal": "NF-12345",
        "itens": [{"tipo": "Camiseta", "tamanho": "M", "quantidade": 50}],
    }
    res_ent = client.post("/entradas", json=entrada_payload)
    assert res_ent.status_code == 201

    # Verifica se estoque subiu para 50
    res_est = client.get("/estoque")
    item_est = [i for i in res_est.json() if i["id"] == item_id][0]
    assert item_est["quantidade_estoque"] == 50

    # 3. Cria aluno para entrega
    res_t = client.post("/turmas", json={"escola_id": escola_id, "nome": "7º A"})
    turma_id = res_t.json()["id"]
    res_aluno = client.post("/alunos", json={"escola_id": escola_id, "turma_id": turma_id, "nome": "Pedro Aluno", "matricula": "999"})
    aluno_id = res_aluno.json()["id"]

    # 4. Registra saída de 2 peças
    saida_payload = {
        "aluno_id": aluno_id,
        "usuario_id": usuario_id,
        "itens": [{"item_uniforme_id": item_id, "quantidade_entregue": 2}],
    }
    res_saida = client.post("/entregas", json=saida_payload)
    assert res_saida.status_code == 201

    # Verifica se estoque reduziu para 48
    res_est_pos = client.get("/estoque")
    item_pos = [i for i in res_est_pos.json() if i["id"] == item_id][0]
    assert item_pos["quantidade_estoque"] == 48


def test_relatorios_completo_e_csv(client, escola_com_usuario):
    """Testa relatório consolidado com visão de turmas e meses (Itens 12 e 13)."""
    # Consulta relatório completo
    res = client.get("/relatorios/completo")
    assert res.status_code == 200
    dados = res.json()
    assert "total_alunos" in dados
    assert "turmas" in dados
    assert "meses" in dados
    assert len(dados["meses"]) == 12

    # Consulta exportação CSV
    res_csv = client.get("/relatorios/entregas-por-turma/csv")
    assert res_csv.status_code == 200
    assert "text/csv" in res_csv.headers["content-type"]
    assert "turma_nome" in res_csv.text


def test_auditoria_logs(client):
    """Testa registro e consulta de logs em arquivo TXT (Item 6)."""
    # Consulta logs da API
    res = client.get("/logs")
    assert res.status_code == 200
    assert "logs" in res.json()

    # Verifica se arquivo TXT de log existe no disco
    assert os.path.exists(LOG_FILE)

    # Testa download do TXT
    res_down = client.get("/logs/download")
    assert res_down.status_code == 200
    assert "text/plain" in res_down.headers["content-type"]


def test_pdf_exportacao_e_dashboard_periodo(client, escola_com_usuario):
    """Testa geração de relatório em PDF (Item 1) e Dashboard com filtros de período (Item 4 e 5)."""
    # 1. Exportação em PDF
    res_pdf = client.get("/relatorios/movimentacoes/pdf?tipo_movimentacao=todas")
    assert res_pdf.status_code == 200
    assert "application/pdf" in res_pdf.headers["content-type"]
    assert res_pdf.content.startswith(b"%PDF")

    # 2. Dashboard filtrado por ano e mês
    res_dash = client.get("/relatorios/dashboard?ano=2026&mes=10")
    assert res_dash.status_code == 200
    dados = res_dash.json()
    assert "ano" in dados and dados["ano"] == 2026
    assert "mes" in dados and dados["mes"] == 10
    assert "saidas_recentes" in dados


def test_lote_detalhes_e_validacoes_entrada(client, escola_com_usuario):
    """Testa validação de data futura, NF duplicada e detalhes dos itens do lote (Item 9 e 10)."""
    escola_id = escola_com_usuario["escola"].id
    usuario_id = escola_com_usuario["usuario"].id

    client.post("/estoque/item", json={"tipo": "Calça", "tamanho": "M"})

    # 1. Rejeita entrada com data futura
    res_futura = client.post("/entradas", json={
        "escola_id": escola_id,
        "usuario_id": usuario_id,
        "nota_fiscal": "NF-FUTURA",
        "data_recebimento": "2099-01-01",
        "itens": [{"tipo": "Calça", "tamanho": "M", "quantidade": 10}],
    })
    assert res_futura.status_code == 400
    assert "posterior" in res_futura.json()["detail"].lower()

    # 2. Entrada com sucesso e NF única
    res_ok = client.post("/entradas", json={
        "escola_id": escola_id,
        "usuario_id": usuario_id,
        "nota_fiscal": "NF-UNICA-999",
        "data_recebimento": "2026-10-15",
        "itens": [{"tipo": "Calça", "tamanho": "M", "quantidade": 10}],
    })
    assert res_ok.status_code == 201
    lote_id = res_ok.json()["lote_id"]

    # 3. Rejeita mesma NF
    res_nf_dup = client.post("/entradas", json={
        "escola_id": escola_id,
        "usuario_id": usuario_id,
        "nota_fiscal": "NF-UNICA-999",
        "data_recebimento": "2026-10-15",
        "itens": [{"tipo": "Calça", "tamanho": "M", "quantidade": 5}],
    })
    assert res_nf_dup.status_code == 400

    # 4. Consulta detalhes do lote (Item 9)
    res_det = client.get(f"/entradas/{lote_id}/detalhes")
    assert res_det.status_code == 200
    det = res_det.json()
    assert det["id"] == lote_id
    assert len(det["itens"]) == 1
    assert det["itens"][0]["tipo"] == "Calça"
    assert det["itens"][0]["tamanho"] == "M"
    assert det["itens"][0]["quantidade"] == 10


def test_autorizar_admin_e_rbac(client, escola_com_usuario):
    """Testa endpoint de autorização imediata de administrador (Item 18)."""
    # Autoriza com credencial do admin da fixture
    res_auth = client.post("/auth/autorizar-admin", json={
        "email": "admin@teste.com",
        "senha": "admin123",
        "acao": "excluir teste",
    })
    assert res_auth.status_code == 200
    assert res_auth.json()["autorizado"] is True

    # Falha com senha errada
    res_fail = client.post("/auth/autorizar-admin", json={
        "email": "admin@teste.com",
        "senha": "senha-incorreta",
        "acao": "excluir teste",
    })
    assert res_fail.status_code == 401

