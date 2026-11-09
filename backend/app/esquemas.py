from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class TreinoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    data_hora: datetime
    dataset: str
    cancer: str
    variante: str
    modo: str
    normalizado: bool
    imagens_total: int
    imagens_por_classe: str
    tamanho: str
    epocas: int
    batch: int
    lr: float
    folds: str
    gpu: str
    tempo_total: str
    tempo_segundos: int
    acc_media: float
    acc_desvio: float
    f1_media: float
    f1_desvio: float
    acc_por_fold: str
    f1_por_fold: str


class ModeloOut(BaseModel):
    id: str
    cancer: str
    modo: str
    tamanho: int
    normalizado: bool
    classes: list[str]
    descricao: str
    metricas: dict
    limiar: float | None = None
    limiar_inconclusivo: float | None = None
    limiar_baixa_certeza: float | None = None


class Probabilidade(BaseModel):
    classe: str
    probabilidade: float


class PrevisaoOut(BaseModel):
    id: int
    modelo_id: str
    cancer: str
    classe_prevista: str
    confianca: float
    probabilidades: list[Probabilidade]
    limiar: float | None = None
    limiar_inconclusivo: float | None = None
    limiar_baixa_certeza: float | None = None
    tempo_ms: float
    aviso: str


class PrevisaoHistorico(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    criado_em: datetime
    modelo_id: str
    classe_prevista: str
    confianca: float
    tempo_ms: float


# ---------- Autenticação ----------

# Formato básico de e-mail: algo@dominio.tld, sem espaços
PADRAO_EMAIL = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


class CadastroIn(BaseModel):
    nome: str = Field(min_length=2, max_length=80)
    email: str = Field(max_length=254, pattern=PADRAO_EMAIL)
    senha: str = Field(min_length=8, max_length=128)

    # mode="before": limpa antes de conferir tamanho e formato
    @field_validator("nome", mode="before")
    @classmethod
    def limpar_nome(cls, valor):
        return " ".join(valor.split()) if isinstance(valor, str) else valor

    @field_validator("email", mode="before")
    @classmethod
    def minusculas(cls, valor):
        return valor.strip().lower() if isinstance(valor, str) else valor


class LoginIn(BaseModel):
    email: str = Field(max_length=254)
    senha: str = Field(max_length=128)

    @field_validator("email", mode="before")
    @classmethod
    def minusculas(cls, valor):
        return valor.strip().lower() if isinstance(valor, str) else valor


class UsuarioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    email: str
    criado_em: datetime


class SessaoOut(BaseModel):
    token: str
    expira_em: datetime
    usuario: UsuarioOut
