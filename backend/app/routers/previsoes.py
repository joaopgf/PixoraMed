from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.autenticacao import usuario_atual
from app.config import settings
from app.db import get_db
from app.esquemas import PrevisaoHistorico, PrevisaoOut, Probabilidade
from app.cliente_ia import INDISPONIVEL, RecusaDaIA, ServicoIAIndisponivel
from app.decisao import decidir, limiar_baixa_certeza, limiar_inconclusivo
from app.tabelas import Previsao, Usuario

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
    usuario: Usuario = Depends(usuario_atual),
):
    conteudo = await arquivo.read()
    if len(conteudo) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"Imagem maior que {settings.max_upload_mb} MB.")

    # A IA pré-processa, roda o modelo e devolve as probabilidades; a imagem não fica guardada em lugar nenhum
    try:
        saida = await request.app.state.ia.prever(modelo_id, arquivo.filename, conteudo, arquivo.content_type)
    except RecusaDaIA as erro:
        raise HTTPException(status_code=erro.status, detail=erro.detalhe) from None
    except ServicoIAIndisponivel:
        raise HTTPException(status_code=503, detail=INDISPONIVEL) from None

    classes, probabilidades, limiar = saida["classes"], saida["probabilidades"], saida.get("limiar")
    classe, confianca = decidir(probabilidades, classes, limiar)

    # Só o resultado vai para o banco
    registro = Previsao(
        usuario_id=usuario.id, modelo_id=saida["modelo_id"], classe_prevista=classe, confianca=confianca, tempo_ms=saida["tempo_ms"]
    )
    db.add(registro)
    db.commit()

    return PrevisaoOut(
        id=registro.id,
        modelo_id=saida["modelo_id"],
        cancer=saida["cancer"],
        classe_prevista=classe,
        confianca=confianca,
        probabilidades=sorted(
            (Probabilidade(classe=nome, probabilidade=float(p)) for nome, p in zip(classes, probabilidades)),
            key=lambda item: item.probabilidade,
            reverse=True,
        ),
        limiar=limiar,
        limiar_inconclusivo=limiar_inconclusivo(limiar),
        limiar_baixa_certeza=limiar_baixa_certeza(limiar),
        tempo_ms=saida["tempo_ms"],
        aviso=AVISO,
    )


@router.get("", response_model=list[PrevisaoHistorico])
def listar_previsoes(limite: int = 20, db: Session = Depends(get_db), usuario: Usuario = Depends(usuario_atual)):
    # Cada usuário vê só as próprias análises
    limite = max(1, min(limite, 100))
    consulta = select(Previsao).where(Previsao.usuario_id == usuario.id).order_by(Previsao.criado_em.desc()).limit(limite)
    return db.scalars(consulta).all()
