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
    nome: str  # rótulo de exibição, ex: "5º A"

class TurmaCreate(TurmaBase):
    pass

class TurmaUpdate(BaseModel):
    """Só envie o que quer atualizar."""
    nome: Optional[str] = None

class TurmaOut(TurmaBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    serie: Optional[int] = None  # auto-extraído do nome


# ============================================================
# USUARIO
# ============================================================
class UsuarioBase(BaseModel):
    escola_id: int
    nome: str
    email: str
    role: Optional[str] = "admin"  # 'admin' ou 'padrao'

class UsuarioCreate(UsuarioBase):
    senha: str = Field(min_length=6, description="Enviada em texto puro pelo cliente; o backend faz o hash antes de salvar.")

class UsuarioUpdate(BaseModel):
    """Só envie o que quer atualizar."""
    nome: Optional[str] = None
    email: Optional[str] = None
    senha: Optional[str] = Field(default=None, min_length=6)
    role: Optional[str] = None

class UsuarioOut(UsuarioBase):
    """Nunca inclui a senha (nem o hash) na resposta."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    role: str = "admin"

class LoginRequest(BaseModel):
    email: str
    senha: str

class AutorizarAdminRequest(BaseModel):
    email: str
    senha: str
    acao: Optional[str] = None


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
    telefone_pai: Optional[str] = None
    email_pai: Optional[str] = None
    telefone_mae: Optional[str] = None
    email_mae: Optional[str] = None
    tamanhos_uniforme: Optional[dict[str, str]] = None

class AlunoCreate(AlunoBase):
    matricula: str
    data_nascimento: Optional[date] = None
    nome_pai: Optional[str] = None
    nome_mae: Optional[str] = None
    tamanho_camiseta: Optional[str] = None

class AlunoUpdate(BaseModel):
    """Todos os campos opcionais: só envie o que quer atualizar."""
    turma_id: Optional[int] = None
    nome: Optional[str] = None
    matricula: Optional[str] = None
    data_nascimento: Optional[date] = None
    nome_pai: Optional[str] = None
    nome_mae: Optional[str] = None
    telefone_pai: Optional[str] = None
    email_pai: Optional[str] = None
    telefone_mae: Optional[str] = None
    email_mae: Optional[str] = None
    tamanho_camiseta: Optional[str] = None
    tamanhos_uniforme: Optional[dict[str, str]] = None

class AlunoOut(AlunoBase):
    """
    Além dos campos cadastrais, inclui campos derivados/calculados:
      - turma / escola: nome de exibição
      - idade: calculada a partir de data_nascimento
      - tamanho: último tamanho de camiseta registrado
      - recebidos: quantidade de entregas já registradas para o aluno
    """
    model_config = ConfigDict(from_attributes=True)
    id: int
    tamanho_camiseta: Optional[str] = None
    telefone_pai: Optional[str] = None
    email_pai: Optional[str] = None
    telefone_mae: Optional[str] = None
    email_mae: Optional[str] = None
    turma: Optional[str] = None
    escola: Optional[str] = None
    idade: Optional[int] = None
    tamanho: Optional[str] = None
    tamanhos_uniforme: Optional[dict[str, str]] = None
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
    data_recebimento: Optional[date] = None
    nota_fiscal: Optional[str] = None
    itens: List[ItemEntrada]

class LoteItemDetalhe(BaseModel):
    id: int
    tipo: str
    tamanho: str
    quantidade: int

class LoteDetalhadoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    data_recebimento: datetime
    nota_fiscal: Optional[str] = None
    escola: Optional[str] = None
    responsavel: Optional[str] = None
    itens: List[LoteItemDetalhe] = []
    total_pecas: int = 0

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

class ItemUniformeCreate(BaseModel):
    """Para criar tipos de uniforme customizados."""
    tipo: str
    tamanho: str

class ItemUniformeUpdate(BaseModel):
    tipo: Optional[str] = None
    tamanho: Optional[str] = None


# ============================================================
# RELATORIOS
# ============================================================
class RelatorioEntregaTurma(BaseModel):
    turma_id: int
    turma_nome: str
    total_alunos: int
    total_alunos_com_entrega: int
    total_entregas: int
    total_pecas_entregues: int

class RelatorioMensal(BaseModel):
    """Relatório mensal com entregas e entradas."""
    mes: int
    nome_mes: str
    entradas_pecas: int = 0
    saidas_pecas: int = 0
    entregas_realizadas: int = 0

class RelatorioCompleto(BaseModel):
    """Relatório completo com dados de todas as turmas e resumo mensal."""
    ano: int
    total_alunos: int
    total_alunos_com_entrega: int
    pct_alunos_com_entrega: float
    total_pecas_entregues: int
    total_pecas_em_estoque: int
    total_entradas_ano: int
    turmas: List[RelatorioEntregaTurma]
    meses: List[RelatorioMensal]


# ============================================================
# DASHBOARD (Semana 5/6 — visão geral)
# ============================================================
class RankingAluno(BaseModel):
    aluno_id: int
    nome: str
    pecas: int

class DashboardOut(BaseModel):
    ano: int
    mes: Optional[int] = None
    alunos_cadastrados: int
    receberam_uniforme: int
    pct_receberam_uniforme: float
    pecas_recebidas_no_ano: int
    pecas_em_estoque: int
    uniformes_por_mes: List[int]  # 12 posições, jan..dez
    mais_de_um_uniforme: List[RankingAluno]
    saidas_recentes: List[EntregaResumoOut] = []
