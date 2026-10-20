import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from dotenv import load_dotenv

# Carrega as variáveis do arquivo .env (se estiver rodando localmente)
load_dotenv()

# Pega a URL do banco. O Render às vezes usa 'postgres://', o SQLAlchemy exige 'postgresql://'
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")
if SQLALCHEMY_DATABASE_URL:
    if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
        SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

    # Se a URL for genérica postgresql:// e psycopg (v3) não estiver disponível,
    # faz fallback automático para psycopg2 para evitar erro ModuleNotFoundError: No module named 'psycopg'
    if SQLALCHEMY_DATABASE_URL.startswith("postgresql://") and not SQLALCHEMY_DATABASE_URL.startswith("postgresql+"):
        try:
            import psycopg  # noqa: F401
        except ImportError:
            try:
                import psycopg2  # noqa: F401
                SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)
            except ImportError:
                pass

# Cria o "motor" do banco
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Cria a fábrica de sessões
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base para criarmos os modelos
Base = declarative_base()


def aplicar_migracoes(target_engine):
    """
    Aplica migrações incrementais nas tabelas existentes de forma idempotente,
    garantindo compatibilidade com bancos legados (PostgreSQL, SQLite, etc.)
    sem gerar erros de 'UndefinedColumn'.
    """
    from sqlalchemy import inspect, text
    try:
        inspector = inspect(target_engine)
        tables = inspector.get_table_names()
        with target_engine.begin() as conn:
            # 1. Tabela usuarios
            if "usuarios" in tables:
                cols = [c["name"] for c in inspector.get_columns("usuarios")]
                if "role" not in cols:
                    conn.execute(text("ALTER TABLE usuarios ADD COLUMN role VARCHAR(50) DEFAULT 'admin'"))
                    conn.execute(text("UPDATE usuarios SET role = 'admin' WHERE role IS NULL"))

            # 2. Tabela alunos
            if "alunos" in tables:
                cols = [c["name"] for c in inspector.get_columns("alunos")]
                if "tamanhos_uniforme" not in cols:
                    conn.execute(text("ALTER TABLE alunos ADD COLUMN tamanhos_uniforme VARCHAR(500)"))
                if "nome_pai" not in cols:
                    conn.execute(text("ALTER TABLE alunos ADD COLUMN nome_pai VARCHAR(255)"))
                if "nome_mae" not in cols:
                    conn.execute(text("ALTER TABLE alunos ADD COLUMN nome_mae VARCHAR(255)"))
                if "data_nascimento" not in cols:
                    conn.execute(text("ALTER TABLE alunos ADD COLUMN data_nascimento DATE"))
                if "telefone_pai" not in cols:
                    conn.execute(text("ALTER TABLE alunos ADD COLUMN telefone_pai VARCHAR(20)"))
                if "email_pai" not in cols:
                    conn.execute(text("ALTER TABLE alunos ADD COLUMN email_pai VARCHAR(255)"))
                if "telefone_mae" not in cols:
                    conn.execute(text("ALTER TABLE alunos ADD COLUMN telefone_mae VARCHAR(20)"))
                if "email_mae" not in cols:
                    conn.execute(text("ALTER TABLE alunos ADD COLUMN email_mae VARCHAR(255)"))
    except Exception as e:
        print(f"[MIGRAÇÃO] Aviso ao verificar/aplicar migrações: {e}")


# Dependência para injetar a sessão do banco nas rotas
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()