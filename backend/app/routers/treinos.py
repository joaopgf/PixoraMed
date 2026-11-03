from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.esquemas import TreinoOut
from app.tabelas import Treino

router = APIRouter(prefix="/api/treinos", tags=["treinos"])


@router.get("", response_model=list[TreinoOut])
def listar_treinos(
    cancer: str | None = None,
    modo: str | None = None,
    normalizado: bool | None = None,
    db: Session = Depends(get_db),
):
    consulta = select(Treino).order_by(Treino.cancer, Treino.modo, Treino.data_hora)
    if cancer:
        consulta = consulta.where(Treino.cancer == cancer)
    if modo:
        consulta = consulta.where(Treino.modo == modo)
    if normalizado is not None:
        consulta = consulta.where(Treino.normalizado == normalizado)
    return db.scalars(consulta).all()


@router.get("/canceres", response_model=list[str])
def listar_canceres(db: Session = Depends(get_db)):
    return db.scalars(select(Treino.cancer).distinct().order_by(Treino.cancer)).all()
