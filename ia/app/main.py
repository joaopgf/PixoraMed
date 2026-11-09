"""Microsserviço de IA do PixoraMed.

Carrega os modelos ONNX uma vez, na subida, e devolve as probabilidades de cada imagem.
Não acessa banco e não guarda a imagem: recebe, calcula, responde e descarta.
Só a API principal chama /modelos e /prever, com o token no cabeçalho X-Token-IA.
"""

import hmac
import logging
import time
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Request, UploadFile
from pydantic import BaseModel

from app.config import settings
from app.inferencia import ImagemInvalida, RegistroModelos, prever

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
log = logging.getLogger("pixoramed-ia")


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not settings.ia_token:
        log.warning("IA_TOKEN não configurado: /modelos e /prever vão recusar todas as chamadas")
    app.state.registro = RegistroModelos(settings.models_dir)
    app.state.registro.carregar()
    log.info("%d modelos carregados de %s", len(app.state.registro.modelos), settings.models_dir)
    yield


app = FastAPI(
    title="PixoraMed IA",
    description="Microsserviço que carrega os modelos ONNX e devolve as probabilidades de cada imagem.",
    version="0.1.0",
    lifespan=lifespan,
)


def exigir_token(x_token_ia: str = Header(default="")) -> None:
    # compare_digest: o tempo da comparação não revela quantos caracteres do token estão certos
    if not settings.ia_token or not hmac.compare_digest(x_token_ia.encode(), settings.ia_token.encode()):
        raise HTTPException(status_code=401, detail="Token do serviço de IA ausente ou inválido.")


class ModeloIA(BaseModel):
    id: str
    cancer: str
    modo: str
    tamanho: int
    normalizado: bool
    classes: list[str]
    descricao: str
    metricas: dict
    limiar: float | None = None


class PrevisaoIA(BaseModel):
    modelo_id: str
    cancer: str
    classes: list[str]
    probabilidades: list[float]  # na mesma ordem de classes
    tempo_ms: float
    # Limiar próprio do modelo (Pele). A API principal decide a classe com ele
    limiar: float | None = None


@app.get("/saude")
def saude(request: Request):
    return {"status": "ok", "modelos": len(request.app.state.registro.modelos)}


@app.get("/modelos", response_model=list[ModeloIA], dependencies=[Depends(exigir_token)])
def listar_modelos(request: Request):
    return [
        ModeloIA(
            id=modelo.id,
            cancer=modelo.cancer,
            modo=modelo.modo,
            tamanho=modelo.tamanho,
            normalizado=modelo.escala != 1,
            classes=modelo.classes,
            descricao=modelo.descricao,
            metricas=modelo.metricas,
            limiar=modelo.limiar,
        )
        for modelo in request.app.state.registro.listar()
    ]


@app.post("/prever", response_model=PrevisaoIA, dependencies=[Depends(exigir_token)])
async def prever_imagem(request: Request, modelo_id: str = Form(...), arquivo: UploadFile = File(...)):
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

    return PrevisaoIA(
        modelo_id=modelo.id,
        cancer=modelo.cancer,
        classes=modelo.classes,
        probabilidades=[float(p) for p in probabilidades],
        tempo_ms=tempo_ms,
        limiar=modelo.limiar,
    )
