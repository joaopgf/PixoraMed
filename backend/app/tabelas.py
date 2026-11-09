from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Treino(Base):
    """Uma linha do resultados.csv: uma execução de 5 folds de um notebook."""

    __tablename__ = "treinos"
    __table_args__ = (UniqueConstraint("data_hora", "dataset", name="uq_treino_execucao"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    data_hora: Mapped[datetime] = mapped_column(DateTime)
    dataset: Mapped[str] = mapped_column(String(120))
    cancer: Mapped[str] = mapped_column(String(60), index=True)
    variante: Mapped[str] = mapped_column(String(120), default="")  # ex.: "grupos pesos limit1000" na pele
    modo: Mapped[str] = mapped_column(String(10))  # "cor" ou "cinza"
    normalizado: Mapped[bool]
    imagens_total: Mapped[int] = mapped_column(Integer)
    imagens_por_classe: Mapped[str] = mapped_column(String(500), default="")
    tamanho: Mapped[str] = mapped_column(String(20))
    epocas: Mapped[int] = mapped_column(Integer)
    batch: Mapped[int] = mapped_column(Integer)
    lr: Mapped[float] = mapped_column(Float)
    folds: Mapped[str] = mapped_column(String(10))
    gpu: Mapped[str] = mapped_column(String(80))
    tempo_total: Mapped[str] = mapped_column(String(20))
    tempo_segundos: Mapped[int] = mapped_column(Integer)
    acc_media: Mapped[float] = mapped_column(Float)
    acc_desvio: Mapped[float] = mapped_column(Float)
    f1_media: Mapped[float] = mapped_column(Float)
    f1_desvio: Mapped[float] = mapped_column(Float)
    acc_por_fold: Mapped[str] = mapped_column(String(200), default="")
    f1_por_fold: Mapped[str] = mapped_column(String(200), default="")
    pasta_graficos: Mapped[str] = mapped_column(String(300), default="")


def agora() -> datetime:
    # UTC sem fuso: o SQLite não guarda fuso, e assim a comparação funciona igual no SQLite e no Postgres
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Usuario(Base):
    """Conta de acesso. A senha nunca é guardada: só o hash scrypt com salt."""

    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(80))
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)  # sempre em minúsculas
    senha_hash: Mapped[str] = mapped_column(String(200))
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=agora)


class Sessao(Base):
    """Sessão de login. O navegador guarda o token; o banco guarda só o SHA-256 dele."""

    __tablename__ = "sessoes"

    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=agora)
    expira_em: Mapped[datetime] = mapped_column(DateTime)


class Previsao(Base):
    """Histórico das previsões feitas pelo app. A imagem enviada nunca é guardada."""

    __tablename__ = "previsoes"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Previsões de antes do login ficam sem dono e não aparecem para ninguém
    usuario_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), index=True, nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    modelo_id: Mapped[str] = mapped_column(String(60), index=True)
    classe_prevista: Mapped[str] = mapped_column(String(60))
    confianca: Mapped[float] = mapped_column(Float)
    tempo_ms: Mapped[float] = mapped_column(Float)
