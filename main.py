from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
import models
import schemas
from database import engine, get_db

# Garante que as tabelas sejam criadas no banco de dados, caso não existam
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="API Controle de Uniformes", version="1.0.0")

@app.get("/")
def read_root():
    return {"message": "API de Controle de Uniformes rodando"}

@app.get("/alunos")
def get_alunos(db: Session = Depends(get_db)):
    """ Retorna a lista de todos os alunos """
    alunos = db.query(models.Aluno).all()
    return alunos

@app.post("/entradas", status_code=201)
def registrar_entrada(entrada: schemas.EntradaUniformeCreate, db: Session = Depends(get_db)):
    """ Registra a entrada de novos uniformes e atualiza o estoque """
    try:
        # 1. Cria o registro do Lote principal
        novo_lote = models.Lote(
            escola_id=entrada.escola_id,
            usuario_id=entrada.usuario_id,
            nota_fiscal=entrada.nota_fiscal
        )
        db.add(novo_lote)
        db.flush() # Salva temporariamente para gerar o ID do lote

        # 2. Processa cada item recebido no lote
        for item in entrada.itens:
            # Verifica se o tipo/tamanho já existe no banco
            item_uniforme = db.query(models.ItemUniforme).filter_by(
                tipo=item.tipo, 
                tamanho=item.tamanho
            ).first()

            # Se não existir, cadastra a peça no banco com estoque 0
            if not item_uniforme:
                item_uniforme = models.ItemUniforme(
                    tipo=item.tipo, 
                    tamanho=item.tamanho, 
                    quantidade_estoque=0
                )
                db.add(item_uniforme)
                db.flush() 

            # 3. Associa a peça ao Lote que acabou de chegar
            novo_item_lote = models.ItemLote(
                lote_id=novo_lote.id,
                item_uniforme_id=item_uniforme.id,
                quantidade=item.quantidade
            )
            db.add(novo_item_lote)

            # 4. Atualiza o estoque somando a quantidade recebida
            item_uniforme.quantidade_estoque += item.quantidade

        # 5. Confirma todas as inserções no banco
        db.commit()
        return {"message": "Entrada registrada com sucesso!", "lote_id": novo_lote.id}

    except Exception as e:
        db.rollback() # Em caso de erro, desfaz tudo
        raise HTTPException(status_code=400, detail=f"Erro ao registrar entrada: {str(e)}")