import time

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.esquemas import PrevisaoHistorico, PrevisaoOut, Probabilidade
from app.inferencia import (
    CLASSE_INCONCLUSIVA,
    ImagemInvalida,
    indice_previsto,
    limiar_inconclusivo_do_modelo,
    prever,
)
from app.tabelas import Previsao

router = APIRouter(prefix="/api/previsoes", tags=["previsões"])

AVISO = (
    "Resultado de um modelo experimental, feito para fins acadêmicos. "
    "Não é um diagnóstico e não substitui a avaliação de um profissional de saúde."
)


@router.post("", response_model=PrevisaoOut)
async def criar_previsao(
    request: Request,
    modelo_id: str = Form(...),
    arquivo: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    modelo = request.app.state.registro.obter(modelo_id)
    if modelo is None:
        raise HTTPException(status_code=404, detail=f"Modelo '{modelo_id}' não encontrado.")

    conteudo = await arquivo.read()
    if len(conteudo) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"Imagem maior que {settings.max_upload_mb} MB.")

    inicio = time.perf_counter()
    try:
        probabilidades = prever(modelo, conteudo)
    except ImagemInvalida as erro:
        raise HTTPException(status_code=422, detail=str(erro)) from erro
    tempo_ms = (time.perf_counter() - inicio) * 1000

    indice = indice_previsto(modelo, probabilidades)
    confianca = float(probabilidades[indice])
    limiar_inconclusivo = limiar_inconclusivo_do_modelo(modelo)
    inconclusivo = limiar_inconclusivo is not None and confianca < limiar_inconclusivo
    classe = CLASSE_INCONCLUSIVA if inconclusivo else modelo.classes[indice]

    # Só o resultado vai para o banco; a imagem é descartada aqui
    registro = Previsao(modelo_id=modelo.id, classe_prevista=classe, confianca=confianca, tempo_ms=tempo_ms)
    db.add(registro)
    db.commit()

    return PrevisaoOut(
        id=registro.id,
        modelo_id=modelo.id,
        cancer=modelo.cancer,
        classe_prevista=classe,
        confianca=confianca,
        probabilidades=sorted(
            (Probabilidade(classe=nome, probabilidade=float(p)) for nome, p in zip(modelo.classes, probabilidades)),
            key=lambda item: item.probabilidade,
            reverse=True,
        ),
        limiar=modelo.limiar,
        limiar_inconclusivo=limiar_inconclusivo,
        tempo_ms=tempo_ms,
        aviso=AVISO,
    )


@router.get("", response_model=list[PrevisaoHistorico])
def listar_previsoes(limite: int = 20, db: Session = Depends(get_db)):
    limite = max(1, min(limite, 100))
    return db.scalars(select(Previsao).order_by(Previsao.criado_em.desc()).limit(limite)).all()
