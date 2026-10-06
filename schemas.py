from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional
from datetime import date, datetime

# ============================================================
# ESCOLA
# ============================================================
class EscolaBase(BaseModel):
    nome: str
    endereco: Optional[str] = None
    diretor: Optional[str] = None

class EscolaCreate(EscolaBase):
    pass

class EscolaOut(EscolaBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ============================================================
# TURMA
# ============================================================
class TurmaBase(BaseModel):
    escola_id: int
    serie: int
    nome: str  # rótulo de exibição, ex: "5º A"

class TurmaCreate(TurmaBase):
    pass

class TurmaOut(TurmaBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ============================================================
# USUARIO
# ============================================================
class UsuarioBase(BaseModel):
    escola_id: int
    nome: str
    email: str

class UsuarioCreate(UsuarioBase):
    senha: str = Field(min_length=6, description="Enviada em texto puro pelo cliente; o backend faz o hash antes de salvar.")

class UsuarioOut(UsuarioBase):
    """Nunca inclui a senha (nem o hash) na resposta."""
    model_config = ConfigDict(from_attributes=True)
    id: int


# ============================================================
# ALUNO
# ============================================================
class AlunoBase(BaseModel):
    escola_id: int
    turma_id: int
    nome: str
    matricula: Optional[str] = None
    data_nascimento: Optional[date] = None
    nome_pai: Optional[str] = None
    nome_mae: Optional[str] = None

class AlunoCreate(AlunoBase):
    # Campos previstos pelas histórias da Sprint para filtro/acompanhamento
    # (editáveis no formulário, ver docs/erd.md). Se não vierem preenchidos,
    # a situação começa como "Pendente" e o tamanho fica em branco até a
    # primeira entrega ser registrada.
    tamanho_camiseta: Optional[str] = None
    situacao_uniforme: Optional[str] = None

class AlunoUpdate(BaseModel):
    """Todos os campos opcionais: só envie o que quer atualizar."""
    turma_id: Optional[int] = None
    nome: Optional[str] = None
    matricula: Optional[str] = None
    data_nascimento: Optional[date] = None
    nome_pai: Optional[str] = None
    nome_mae: Optional[str] = None
    tamanho_camiseta: Optional[str] = None
    situacao_uniforme: Optional[str] = None

class AlunoOut(AlunoBase):
    """
    Além dos campos cadastrais (que ficam salvos na tabela `alunos`), inclui
    campos derivados/calculados para facilitar a vida do frontend, que já
    esperava esse formato "achatado":
      - turma / escola: nome de exibição, não só o id
      - idade: calculada a partir de data_nascimento
      - tamanho / status: hoje são colunas reais (`tamanho_camiseta`,
        `situacao_uniforme`), editáveis no formulário do aluno, mas também
        atualizadas automaticamente sempre que uma entrega é registrada —
        ver routers/entregas.py e "Observações" em docs/erd.md.
      - recebidos: quantidade de entregas já registradas para o aluno
    """
    model_config = ConfigDict(from_attributes=True)
    id: int
    tamanho_camiseta: Optional[str] = None
    situacao_uniforme: Optional[str] = None
    turma: Optional[str] = None
    escola: Optional[str] = None
    idade: Optional[int] = None
    tamanho: Optional[str] = None
    status: Optional[str] = None
    recebidos: int = 0


# ============================================================
# ENTRADA DE ESTOQUE (lote recebido do governo/fornecedor)
# ============================================================
class ItemEntrada(BaseModel):
    tipo: str
    tamanho: str
    quantidade: int = Field(gt=0)

class EntradaUniformeCreate(BaseModel):
    escola_id: int
    usuario_id: int
    nota_fiscal: Optional[str] = None
    itens: List[ItemEntrada]

class LoteOut(BaseModel):
    """ Uma linha do histórico de entradas (tela 'Entradas' dentro de Uniformes). """
    model_config = ConfigDict(from_attributes=True)
    id: int
    data_recebimento: datetime
    nota_fiscal: Optional[str] = None
    escola: Optional[str] = None
    responsavel: Optional[str] = None
    itens: int = 0
    total_pecas: int = 0


# ============================================================
# ENTREGA (uniforme entregue a um aluno)
# ============================================================
class ItemEntregaCreate(BaseModel):
    item_uniforme_id: int
    quantidade_entregue: int = Field(gt=0)

class EntregaCreate(BaseModel):
    aluno_id: int
    usuario_id: int
    itens: List[ItemEntregaCreate]

class ItemEntregaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    item_uniforme_id: int
    tipo: Optional[str] = None
    tamanho: Optional[str] = None
    quantidade_entregue: int

class EntregaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    aluno_id: int
    usuario_id: int
    responsavel: Optional[str] = None
    data_entrega: datetime
    itens: List[ItemEntregaOut] = []

class EntregaResumoOut(BaseModel):
    """ Uma linha do histórico global de entregas (tela 'Entregas' dentro de Uniformes). """
    model_config = ConfigDict(from_attributes=True)
    id: int
    data_entrega: datetime
    aluno_id: int
    aluno: Optional[str] = None
    turma: Optional[str] = None
    responsavel: Optional[str] = None
    pecas: Optional[str] = None
    quantidade: int = 0


# ============================================================
# ESTOQUE
# ============================================================
LIMITE_SALDO_BAIXO = 10  # abaixo disso, o item entra em alerta

class ItemUniformeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    tipo: str
    tamanho: str
    quantidade_estoque: int
    alerta_saldo_baixo: bool = False


# ============================================================
# RELATORIOS
# ============================================================
class RelatorioEntregaTurma(BaseModel):
    turma_id: int
    serie: int
    total_alunos: int
    total_alunos_com_entrega: int
    total_entregas: int
    total_pecas_entregues: int


# ============================================================
# DASHBOARD (Semana 5/6 — visão geral)
# ============================================================
class RankingAluno(BaseModel):
    aluno_id: int
    nome: str
    pecas: int

class DashboardOut(BaseModel):
    ano: int
    alunos_cadastrados: int
    receberam_uniforme: int
    pct_receberam_uniforme: float
    pecas_recebidas_no_ano: int
    pecas_em_estoque: int
    uniformes_por_mes: List[int]  # 12 posições, jan..dez
    mais_de_um_uniforme: List[RankingAluno]
