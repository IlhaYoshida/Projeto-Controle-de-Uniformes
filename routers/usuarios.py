from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import bcrypt
import models
import schemas
from database import get_db

router = APIRouter(prefix="/usuarios", tags=["Usuários"])


def hash_senha(senha_texto_puro: str) -> str:
    """ Gera o hash bcrypt da senha. Nunca guardamos a senha em texto puro. """
    return bcrypt.hashpw(senha_texto_puro.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


@router.post("", response_model=schemas.UsuarioOut, status_code=201)
def criar_usuario(usuario: schemas.UsuarioCreate, db: Session = Depends(get_db)):
    """ Cadastra um novo usuário (ex: funcionário da secretaria) """
    escola = db.query(models.Escola).filter(models.Escola.id == usuario.escola_id).first()
    if not escola:
        raise HTTPException(status_code=404, detail="Escola informada não existe")

    novo_usuario = models.Usuario(
        escola_id=usuario.escola_id,
        nome=usuario.nome,
        email=usuario.email,
        senha=hash_senha(usuario.senha),
    )
    db.add(novo_usuario)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Já existe um usuário com esse e-mail")
    db.refresh(novo_usuario)
    return novo_usuario


@router.get("", response_model=list[schemas.UsuarioOut])
def listar_usuarios(db: Session = Depends(get_db)):
    """ Lista usuários (sem retornar a senha) """
    return db.query(models.Usuario).all()
