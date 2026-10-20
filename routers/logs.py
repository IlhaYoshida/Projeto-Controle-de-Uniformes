import os
from fastapi import APIRouter
from fastapi.responses import FileResponse
from logger import LOG_FILE, obter_logs, registrar_log

router = APIRouter(prefix="/logs", tags=["Logs"])


@router.get("")
def listar_logs(limite: int = 200):
    """Retorna as últimas linhas do log do sistema."""
    return {"logs": obter_logs(limite)}


@router.get("/download")
def baixar_log_txt():
    """Permite download do arquivo TXT de logs do sistema."""
    if not os.path.exists(LOG_FILE):
        registrar_log("INICIALIZACAO", "Arquivo de logs inicializado")
    return FileResponse(
        LOG_FILE,
        media_type="text/plain; charset=utf-8",
        filename="sistema_logs.txt",
    )
