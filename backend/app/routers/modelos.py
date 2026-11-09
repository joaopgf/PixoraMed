from fastapi import APIRouter, HTTPException, Request

from app.cliente_ia import INDISPONIVEL, ServicoIAIndisponivel
from app.decisao import limiar_baixa_certeza, limiar_inconclusivo
from app.esquemas import ModeloOut

router = APIRouter(prefix="/api/modelos", tags=["modelos"])


@router.get("", response_model=list[ModeloOut])
async def listar_modelos(request: Request):
    try:
        modelos = await request.app.state.ia.listar_modelos()
    except ServicoIAIndisponivel:
        raise HTTPException(status_code=503, detail=INDISPONIVEL) from None
    # Os limiares de decisão são da API principal; a IA só informa o limiar próprio do modelo
    return [
        ModeloOut(
            **modelo,
            limiar_inconclusivo=limiar_inconclusivo(modelo.get("limiar")),
            limiar_baixa_certeza=limiar_baixa_certeza(modelo.get("limiar")),
        )
        for modelo in sorted(modelos, key=lambda modelo: (modelo["cancer"], modelo["modo"]))
    ]
