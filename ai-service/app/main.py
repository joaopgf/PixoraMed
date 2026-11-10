"""Rotas do ai-service (FastAPI): saúde, lista de modelos e predição.

Carrega os modelos ONNX uma vez, na subida, e devolve as probabilidades de cada imagem.
Não acessa banco e não guarda a imagem. Só o backend chama /models e /predict, com o token no header X-Internal-Token.
"""

import hmac
import logging
import time
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Request, UploadFile
from pydantic import BaseModel

from app.config import settings
from app.inference import InvalidImage, ModelRegistry, predict

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
log = logging.getLogger("pixoramed-ai-service")


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.registry = ModelRegistry(settings.models_dir)
    app.state.registry.load()
    log.info("%d modelos carregados de %s", len(app.state.registry.models), settings.models_dir)
    yield


app = FastAPI(
    title="PixoraMed AI Service",
    description="Microsserviço que carrega os modelos ONNX e devolve as probabilidades de cada imagem.",
    version="1.0.0",
    lifespan=lifespan,
)


def require_token(x_internal_token: str = Header(default="")) -> None:
    # compare_digest: o tempo da comparação não revela quantos caracteres do token estão certos
    if not hmac.compare_digest(x_internal_token.encode(), settings.ai_service_token.encode()):
        raise HTTPException(status_code=401, detail="Token do serviço de IA ausente ou inválido.")


class ModelOut(BaseModel):
    id: str
    cancer_type: str
    mode: str
    size: int
    normalized: bool
    classes: list[str]
    description: str
    metrics: dict
    threshold: float | None = None


class PredictionOut(BaseModel):
    model_id: str
    cancer_type: str
    classes: list[str]
    probabilities: list[float]  # na mesma ordem de classes
    time_ms: float
    # Limiar próprio do modelo (Pele). O backend decide a classe com ele
    threshold: float | None = None


@app.get("/health")
def health(request: Request):
    return {"status": "ok", "models": len(request.app.state.registry.models)}


@app.get("/models", response_model=list[ModelOut], dependencies=[Depends(require_token)])
def list_models(request: Request):
    return [
        ModelOut(
            id=model.id,
            cancer_type=model.cancer_type,
            mode=model.mode,
            size=model.size,
            normalized=model.scale != 1,
            classes=model.classes,
            description=model.description,
            metrics=model.metrics,
            threshold=model.threshold,
        )
        for model in request.app.state.registry.list()
    ]


@app.post("/predict", response_model=PredictionOut, dependencies=[Depends(require_token)])
async def predict_image(request: Request, model_id: str = Form(...), file: UploadFile = File(...)):
    model = request.app.state.registry.get(model_id)
    if model is None:
        raise HTTPException(status_code=404, detail=f"Modelo '{model_id}' não encontrado.")

    content = await file.read()
    if len(content) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"Imagem maior que {settings.max_upload_mb} MB.")

    start = time.perf_counter()
    try:
        probabilities = predict(model, content)
    except InvalidImage as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    time_ms = (time.perf_counter() - start) * 1000

    return PredictionOut(
        model_id=model.id,
        cancer_type=model.cancer_type,
        classes=model.classes,
        probabilities=[float(p) for p in probabilities],
        time_ms=time_ms,
        threshold=model.threshold,
    )
