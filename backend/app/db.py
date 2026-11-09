from collections.abc import Iterator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings


def normalizar_url(url: str) -> str:
    # Neon e Render entregam "postgres://" ou "postgresql://"; o SQLAlchemy precisa saber que o driver é o psycopg 3
    for prefixo in ("postgres://", "postgresql://"):
        if url.startswith(prefixo):
            return "postgresql+psycopg://" + url[len(prefixo):]
    return url


def criar_engine(url: str):
    url = normalizar_url(url)
    connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
    return create_engine(url, pool_pre_ping=True, connect_args=connect_args)


engine = criar_engine(settings.database_url)
SessionLocal = sessionmaker(bind=engine, autoflush=False)


class Base(DeclarativeBase):
    pass


def atualizar_esquema(engine) -> None:
    """O create_all não altera tabelas que já existem. Acrescenta as colunas novas nos bancos criados antes delas."""
    colunas = {coluna["name"] for coluna in inspect(engine).get_columns("previsoes")}
    if "usuario_id" not in colunas:
        with engine.begin() as conexao:
            conexao.execute(text("ALTER TABLE previsoes ADD COLUMN usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE"))
            conexao.execute(text("CREATE INDEX IF NOT EXISTS ix_previsoes_usuario_id ON previsoes (usuario_id)"))


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
