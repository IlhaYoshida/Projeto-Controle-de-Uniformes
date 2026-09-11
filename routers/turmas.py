from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models
import schemas
from database import get_db

router = APIRouter(prefix="/turmas", tags=["Turmas"])


@router.post("", response_model=schemas.TurmaOut, status_code=201)
def criar_turma(turma: schemas.TurmaCreate, db: Session = Depends(get_db)):
    """ Cadastra uma nova turma (ex: nome="5º A", serie=5) vinculada a uma escola """
    escola = db.query(models.Escola).filter(models.Escola.id == turma.escola_id).first()
    if not escola:
        raise HTTPException(status_code=404, detail="Escola informada não existe")

    nova_turma = models.Turma(**turma.model_dump())
    db.add(nova_turma)
    db.commit()
    db.refresh(nova_turma)
    return nova_turma


@router.get("", response_model=list[schemas.TurmaOut])
def listar_turmas(escola_id: int | None = None, db: Session = Depends(get_db)):
    """ Lista turmas, opcionalmente filtrando por escola """
    query = db.query(models.Turma)
    if escola_id is not None:
        query = query.filter(models.Turma.escola_id == escola_id)
    return query.all()
