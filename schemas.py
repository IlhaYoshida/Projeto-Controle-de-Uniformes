from pydantic import BaseModel
from typing import List, Optional

# --- Schemas para Entrada de Lote (Estoque) ---

class ItemEntrada(BaseModel):
    tipo: str
    tamanho: str
    quantidade: int

class EntradaUniformeCreate(BaseModel):
    escola_id: int
    usuario_id: int
    nota_fiscal: Optional[str] = None
    itens: List[ItemEntrada]