from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import bcrypt
import models
import schemas
from database import get_db
from logger import registrar_log

router = APIRouter(prefix="/auth", tags=["Autenticação"])


@router.get("/status-inicial")
def status_inicial(db: Session = Depends(get_db)):
    """Retorna se o sistema precisa de configuração inicial (escola e primeiro usuário)."""
    escolas_count = db.query(models.Escola).count()
    usuarios_count = db.query(models.Usuario).count()
    turmas_count = db.query(models.Turma).count()
    escola = db.query(models.Escola).first()

    return {
        "precisa_setup": escolas_count == 0 or usuarios_count == 0,
        "escola_cadastrada": escolas_count > 0,
        "escola_id": escola.id if escola else None,
        "escola_nome": escola.nome if escola else None,
        "usuarios_cadastrados": usuarios_count,
        "turmas_cadastradas": turmas_count,
    }


@router.post("/login", response_model=schemas.UsuarioOut)
def login(dados: schemas.LoginRequest, db: Session = Depends(get_db)):
    """Autentica um usuário com email e senha."""
    usuario = db.query(models.Usuario).filter(models.Usuario.email == dados.email).first()
    if not usuario:
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")

    if not bcrypt.checkpw(dados.senha.encode("utf-8"), usuario.senha.encode("utf-8")):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")

    registrar_log("LOGIN", f"Usuário '{usuario.nome}' (id={usuario.id}) fez login", usuario.nome)
    return usuario


@router.post("/setup-inicial")
def setup_inicial(dados: dict, db: Session = Depends(get_db)):
    """
    Configuração inicial ou cadastro/redefinição de administrador:
    - Cadastra ou atualiza a escola única
    - Cadastra ou atualiza o usuário administrador
    - Opcionalmente cadastra turmas e uniformes iniciais
    """
    escola_nome = dados.get("escola_nome")
    usuario_nome = dados.get("usuario_nome")
    usuario_email = dados.get("usuario_email")
    usuario_senha = dados.get("usuario_senha")

    if not escola_nome or not usuario_nome or not usuario_email or not usuario_senha:
        raise HTTPException(status_code=400, detail="Nome da escola, nome do usuário, e-mail e senha são obrigatórios")

    # Verifica se já existe escola
    escola = db.query(models.Escola).first()
    if not escola:
        escola = models.Escola(nome=escola_nome, diretor=dados.get("diretor"), endereco=dados.get("endereco"))
        db.add(escola)
        db.commit()
        db.refresh(escola)
        registrar_log("SETUP_INICIAL", f"Escola '{escola.nome}' cadastrada no setup inicial")
    else:
        escola.nome = escola_nome
        if dados.get("diretor"):
            escola.diretor = dados.get("diretor")
        if dados.get("endereco"):
            escola.endereco = dados.get("endereco")
        db.commit()

    # Cria ou atualiza o usuário administrador
    usuario = db.query(models.Usuario).filter(models.Usuario.email == usuario_email).first()
    senha_hash = bcrypt.hashpw(usuario_senha.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    if not usuario:
        usuario = models.Usuario(
            escola_id=escola.id,
            nome=usuario_nome,
            email=usuario_email,
            senha=senha_hash,
        )
        db.add(usuario)
        db.commit()
        db.refresh(usuario)
        registrar_log("SETUP_INICIAL", f"Usuário administrador '{usuario.nome}' cadastrado")
    else:
        usuario.nome = usuario_nome
        usuario.senha = senha_hash
        usuario.escola_id = escola.id
        db.commit()
        registrar_log("SETUP_INICIAL", f"Usuário administrador '{usuario.nome}' atualizado")

    # Turmas iniciais se fornecidas
    turmas_iniciais = dados.get("turmas", [])
    for nome_turma in turmas_iniciais:
        nome_limpo = str(nome_turma).strip()
        if not nome_limpo:
            continue
        ja_tem = db.query(models.Turma).filter(models.Turma.escola_id == escola.id, models.Turma.nome == nome_limpo).first()
        if not ja_tem:
            from routers.turmas import _extrair_serie
            nova_t = models.Turma(escola_id=escola.id, nome=nome_limpo, serie=_extrair_serie(nome_limpo))
            db.add(nova_t)
    db.commit()

    # Uniformes iniciais se fornecidos
    uniformes_iniciais = dados.get("uniformes", [])
    for u in uniformes_iniciais:
        tipo = u.get("tipo")
        tamanho = u.get("tamanho")
        if tipo and tamanho:
            ja_tem = db.query(models.ItemUniforme).filter_by(tipo=tipo, tamanho=tamanho).first()
            if not ja_tem:
                db.add(models.ItemUniforme(tipo=tipo, tamanho=tamanho, quantidade_estoque=0))
    db.commit()

    registrar_log("SETUP_INICIAL_CONCLUIDO", f"Setup inicial concluído para escola '{escola.nome}'")

    return {
        "mensagem": "Configuração realizada com sucesso!",
        "escola_id": escola.id,
        "usuario": {
            "id": usuario.id,
            "nome": usuario.nome,
            "email": usuario.email,
            "escola_id": usuario.escola_id,
        }
    }
