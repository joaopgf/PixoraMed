from fastapi import APIRouter, Request

from app.esquemas import ModeloOut
from app.inferencia import limiar_inconclusivo_do_modelo

router = APIRouter(prefix="/api/modelos", tags=["modelos"])


@router.get("", response_model=list[ModeloOut])
def listar_modelos(request: Request):
    return [
        ModeloOut(
            id=modelo.id,
            cancer=modelo.cancer,
            modo=modelo.modo,
            tamanho=modelo.tamanho,
            normalizado=modelo.escala != 1,
            classes=modelo.classes,
            descricao=modelo.descricao,
            metricas=modelo.metricas,
            limiar=modelo.limiar,
            limiar_inconclusivo=limiar_inconclusivo_do_modelo(modelo),
        )
        for modelo in request.app.state.registro.listar()
    ]
