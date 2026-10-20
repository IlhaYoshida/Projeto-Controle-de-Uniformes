"""
Módulo de logging: registra todas as ações do sistema em um arquivo TXT.
Cada linha contém: data/hora, usuário (se disponível), ação e detalhes.
"""
import os
import logging

LOG_DIR = os.path.join(os.path.dirname(__file__), "logs")
os.makedirs(LOG_DIR, exist_ok=True)

LOG_FILE = os.path.join(LOG_DIR, "sistema_logs.txt")

# Configura o logger
logger = logging.getLogger("uniforme_plus")
logger.setLevel(logging.INFO)

# Handler para arquivo TXT
file_handler = logging.FileHandler(LOG_FILE, encoding="utf-8")
file_handler.setLevel(logging.INFO)

# Formato: [DATA_HORA] | USUARIO | AÇÃO | DETALHES
formatter = logging.Formatter("%(asctime)s | %(message)s", datefmt="%Y-%m-%d %H:%M:%S")
file_handler.setFormatter(formatter)

if not logger.handlers:
    logger.addHandler(file_handler)


def registrar_log(acao: str, detalhes: str = "", usuario: str = "Sistema"):
    """Registra uma ação no log do sistema em arquivo TXT."""
    mensagem = f"USUARIO: {usuario} | ACAO: {acao} | DETALHES: {detalhes}"
    logger.info(mensagem)


def obter_logs(limite: int = 200) -> list[str]:
    """Retorna as últimas `limite` linhas do log."""
    if not os.path.exists(LOG_FILE):
        return []
    with open(LOG_FILE, "r", encoding="utf-8") as f:
        linhas = f.readlines()
    return [l.strip() for l in linhas[-limite:]][::-1]  # Mais recentes primeiro
