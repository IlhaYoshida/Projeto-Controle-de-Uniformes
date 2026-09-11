from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import models
from database import engine

from routers import escolas, turmas, usuarios, alunos, entradas, entregas, estoque, relatorios

# Garante que as tabelas sejam criadas no banco de dados, caso não existam
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="API Controle de Uniformes",
    version="1.1.0",
    description="API do Sistema de Controle de Uniformes Escolares.",
)

# --- CONFIGURAÇÃO DE CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Na fase de testes, permite qualquer origem
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ROTAS ---
app.include_router(escolas.router)
app.include_router(turmas.router)
app.include_router(usuarios.router)
app.include_router(alunos.router)
app.include_router(entradas.router)
app.include_router(entregas.router)
app.include_router(estoque.router)
app.include_router(relatorios.router)


@app.get("/")
def read_root():
    return {"message": "API de Controle de Uniformes Rodando!"}
