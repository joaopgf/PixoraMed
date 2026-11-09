import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import Base, SessionLocal, atualizar_esquema, engine
from app.importacao import importar_resultados
from app.cliente_ia import ClienteIA
from app.routers import auth, modelos, previsoes, treinos
from app.site import registrar_site

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
log = logging.getLogger("pixoramed")


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)
    atualizar_esquema(engine)

    if settings.importar_csv_no_inicio:
        with SessionLocal() as db:
            inseridos = importar_resultados(db, settings.resultados_csv)
        log.info("resultados.csv: %d treinos novos importados", inseridos)

    # Os modelos ficam no microsserviço de IA; aqui só o cliente HTTP
    app.state.ia = ClienteIA(settings.ia_url, settings.ia_token, settings.ia_timeout)
    log.info("Serviço de IA em %s", settings.ia_url)
    yield
    await app.state.ia.fechar()


app = FastAPI(
    title="PixoraMed API",
    description="Login, histórico e decisão das análises de imagens médicas. Os modelos rodam no microsserviço de IA.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.lista_cors,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth.router)
app.include_router(treinos.router)
app.include_router(modelos.router)
app.include_router(previsoes.router)


# Não consulta a IA: o Render usa esta rota para saber se a API subiu, e a IA pode estar dormindo
@app.get("/api/saude", tags=["saúde"])
def saude():
    return {"status": "ok"}


# Por último, depois de todas as rotas da API
if (settings.frontend_dir / "index.html").is_file():
    registrar_site(app, settings.frontend_dir)
    log.info("Site servido de %s", settings.frontend_dir)
