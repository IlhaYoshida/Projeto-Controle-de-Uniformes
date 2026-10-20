import os
import sys

# Garante que a raiz do projeto esteja no sys.path para importação dos módulos
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database import Base, get_db
from main import app
import models

# Banco de testes em memória (isolado, rápido e independente)
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine_test = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_test)


@pytest.fixture(scope="function")
def db_session():
    """Cria as tabelas em memória para cada teste e as descarta no final."""
    Base.metadata.create_all(bind=engine_test)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine_test)


@pytest.fixture(scope="function")
def client(db_session):
    """Client FastAPI com dependência do banco de testes injetada."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def escola_com_usuario(db_session):
    """Cria uma escola e usuário padrão para testes."""
    import bcrypt
    escola = models.Escola(nome="Escola Municipal Teste", diretor="Diretor Teste")
    db_session.add(escola)
    db_session.commit()
    db_session.refresh(escola)

    senha_hash = bcrypt.hashpw("admin123".encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    usuario = models.Usuario(
        escola_id=escola.id,
        nome="Admin Teste",
        email="admin@teste.com",
        senha=senha_hash,
    )
    db_session.add(usuario)
    db_session.commit()
    db_session.refresh(usuario)

    return {"escola": escola, "usuario": usuario}
