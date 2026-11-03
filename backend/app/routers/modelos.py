from fastapi import APIRouter, Request

from app.esquemas import ModeloOut

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
        )
        for modelo in request.app.state.registro.listar()
    ]
