from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models
import schemas
from database import get_db

router = APIRouter(prefix="/escolas", tags=["Escolas"])


@router.post("", response_model=schemas.EscolaOut, status_code=201)
def criar_escola(escola: schemas.EscolaCreate, db: Session = Depends(get_db)):
    """ Cadastra uma nova escola """
    nova_escola = models.Escola(**escola.model_dump())
    db.add(nova_escola)
    db.commit()
    db.refresh(nova_escola)
    return nova_escola


@router.get("", response_model=list[schemas.EscolaOut])
def listar_escolas(db: Session = Depends(get_db)):
    """ Lista todas as escolas cadastradas """
    return db.query(models.Escola).all()


@router.get("/{escola_id}", response_model=schemas.EscolaOut)
def obter_escola(escola_id: int, db: Session = Depends(get_db)):
    escola = db.query(models.Escola).filter(models.Escola.id == escola_id).first()
    if not escola:
        raise HTTPException(status_code=404, detail="Escola não encontrada")
    return escola
