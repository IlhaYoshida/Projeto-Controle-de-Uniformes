from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import bcrypt
import models
import schemas
from database import get_db
from logger import registrar_log

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
    registrar_log("CRIAR_USUARIO", f"Usuário '{novo_usuario.nome}' (id={novo_usuario.id}) criado")
    return novo_usuario


@router.get("", response_model=list[schemas.UsuarioOut])
def listar_usuarios(db: Session = Depends(get_db)):
    """ Lista usuários (sem retornar a senha) """
    return db.query(models.Usuario).all()


@router.get("/{usuario_id}", response_model=schemas.UsuarioOut)
def obter_usuario(usuario_id: int, db: Session = Depends(get_db)):
    """ Retorna um usuário específico """
    usuario = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return usuario


@router.put("/{usuario_id}", response_model=schemas.UsuarioOut)
def atualizar_usuario(usuario_id: int, dados: schemas.UsuarioUpdate, db: Session = Depends(get_db)):
    """ Atualiza dados de um usuário """
    usuario = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    if dados.nome is not None:
        usuario.nome = dados.nome
    if dados.email is not None:
        usuario.email = dados.email
    if dados.senha is not None:
        usuario.senha = hash_senha(dados.senha)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Já existe um usuário com esse e-mail")
    db.refresh(usuario)
    registrar_log("ATUALIZAR_USUARIO", f"Usuário '{usuario.nome}' (id={usuario.id}) atualizado")
    return usuario


@router.delete("/{usuario_id}", status_code=204)
def excluir_usuario(usuario_id: int, db: Session = Depends(get_db)):
    """ Remove um usuário """
    usuario = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    # Verifica se há entregas vinculadas
    entregas = db.query(models.Entrega).filter(models.Entrega.usuario_id == usuario_id).count()
    if entregas:
        raise HTTPException(
            status_code=409,
            detail=f"Não é possível excluir: existem {entregas} entrega(s) vinculada(s) a este usuário"
        )

    nome = usuario.nome
    db.delete(usuario)
    db.commit()
    registrar_log("EXCLUIR_USUARIO", f"Usuário '{nome}' (id={usuario_id}) excluído")
    return None
