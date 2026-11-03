from datetime import datetime

from pydantic import BaseModel, ConfigDict


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


class Probabilidade(BaseModel):
    classe: str
    probabilidade: float


class PrevisaoOut(BaseModel):
    modelo_id: str
    cancer: str
    classe_prevista: str
    confianca: float
    probabilidades: list[Probabilidade]
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
