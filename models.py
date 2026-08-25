from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.sql import func
from database import Base

class Escola(Base):
    __tablename__ = "escolas"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(255), nullable=False)
    endereco = Column(String(255))
    diretor = Column(String(255))

class Turma(Base):
    __tablename__ = "turma"
    id = Column(Integer, primary_key=True, index=True)
    escola_id = Column(Integer, ForeignKey("escolas.id", ondelete="CASCADE"), nullable=False)
    serie = Column(Integer, nullable=False)

class Aluno(Base):
    __tablename__ = "alunos"
    id = Column(Integer, primary_key=True, index=True)
    escola_id = Column(Integer, ForeignKey("escolas.id", ondelete="CASCADE"), nullable=False)
    turma_id = Column(Integer, ForeignKey("turma.id", ondelete="RESTRICT"), nullable=False)
    nome = Column(String(255), nullable=False)
    matricula = Column(String(100), unique=True)
    data_nascimento = Column(Date)
    nome_pai = Column(String(255))
    nome_mae = Column(String(255))

class Usuario(Base):
    __tablename__ = "usuarios"
    id = Column(Integer, primary_key=True, index=True)
    escola_id = Column(Integer, ForeignKey("escolas.id", ondelete="CASCADE"), nullable=False)
    nome = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    senha = Column(String(255), nullable=False)

class ItemUniforme(Base):
    __tablename__ = "item_uniforme"
    id = Column(Integer, primary_key=True, index=True)
    tipo = Column(String(50), nullable=False)
    tamanho = Column(String(5), nullable=False)
    quantidade_estoque = Column(Integer, default=0)

    __table_args__ = (
        CheckConstraint("tipo IN ('Camiseta', 'Calça', 'Bermuda', 'Agasalho', 'Boina')", name="chk_tipo"),
        CheckConstraint("tamanho IN ('PP', 'P', 'M', 'G', 'GG', 'XG', '3G')", name="chk_tamanho"),
    )

class Entrega(Base):
    __tablename__ = "entregas"
    id = Column(Integer, primary_key=True, index=True)
    aluno_id = Column(Integer, ForeignKey("alunos.id", ondelete="CASCADE"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False)
    data_entrega = Column(DateTime(timezone=True), server_default=func.now())

class ItemEntrega(Base):
    __tablename__ = "item_entregas"
    id = Column(Integer, primary_key=True, index=True)
    entrega_id = Column(Integer, ForeignKey("entregas.id", ondelete="CASCADE"), nullable=False)
    item_uniforme_id = Column(Integer, ForeignKey("item_uniforme.id", ondelete="RESTRICT"), nullable=False)
    quantidade_entregue = Column(Integer, nullable=False, default=1)

class Lote(Base):
    __tablename__ = "lotes"
    id = Column(Integer, primary_key=True, index=True)
    escola_id = Column(Integer, ForeignKey("escolas.id", ondelete="CASCADE"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False)
    data_recebimento = Column(DateTime(timezone=True), server_default=func.now())
    nota_fiscal = Column(String(100))

class ItemLote(Base):
    __tablename__ = "item_lote"
    id = Column(Integer, primary_key=True, index=True)
    lote_id = Column(Integer, ForeignKey("lotes.id", ondelete="CASCADE"), nullable=False)
    item_uniforme_id = Column(Integer, ForeignKey("item_uniforme.id", ondelete="RESTRICT"), nullable=False)
    quantidade = Column(Integer, nullable=False)