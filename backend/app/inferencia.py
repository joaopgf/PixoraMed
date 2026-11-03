"""Carrega os modelos ONNX da pasta models/ e faz a previsão de uma imagem."""

import json
import logging
from dataclasses import dataclass, field
from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort

log = logging.getLogger(__name__)


class ImagemInvalida(ValueError):
    pass


@dataclass
class ModeloCarregado:
    id: str
    cancer: str
    modo: str  # "cor" ou "cinza"
    tamanho: int
    escala: float  # 255 se o modelo foi treinado normalizado, 1 se não
    classes: list[str]
    sessao: ort.InferenceSession
    descricao: str = ""
    metricas: dict = field(default_factory=dict)

    @property
    def nome_entrada(self) -> str:
        return self.sessao.get_inputs()[0].name


def preprocessar(conteudo: bytes, modo: str, tamanho: int, escala: float) -> np.ndarray:
    """Repete o load_data dos notebooks: lê com OpenCV, BGR -> RGB, resize, (C, H, W) e divide pela escala."""
    buffer = np.frombuffer(conteudo, dtype=np.uint8)
    flag = cv2.IMREAD_COLOR if modo == "cor" else cv2.IMREAD_GRAYSCALE
    imagem = cv2.imdecode(buffer, flag)
    if imagem is None:
        raise ImagemInvalida("Não foi possível ler a imagem. Envie um arquivo JPG ou PNG.")

    if modo == "cor":
        imagem = cv2.cvtColor(imagem, cv2.COLOR_BGR2RGB)
    imagem = cv2.resize(imagem, (tamanho, tamanho))

    # (H, W, 3) -> (3, H, W) na cor; (H, W) -> (1, H, W) no cinza
    imagem = imagem.transpose(2, 0, 1) if modo == "cor" else imagem[np.newaxis]
    return (imagem[np.newaxis].astype(np.float32)) / np.float32(escala)


def softmax(logits: np.ndarray) -> np.ndarray:
    exp = np.exp(logits - logits.max())
    return exp / exp.sum()


def prever(modelo: ModeloCarregado, conteudo: bytes) -> np.ndarray:
    entrada = preprocessar(conteudo, modelo.modo, modelo.tamanho, modelo.escala)
    logits = modelo.sessao.run(None, {modelo.nome_entrada: entrada})[0][0]
    return softmax(logits)


class RegistroModelos:
    """Cada modelo é um par <id>.onnx + <id>.json na pasta models/ (gerados por scripts/exportar_onnx.py)."""

    def __init__(self, pasta: Path) -> None:
        self.pasta = pasta
        self.modelos: dict[str, ModeloCarregado] = {}

    def carregar(self) -> None:
        self.modelos.clear()
        if not self.pasta.exists():
            log.warning("Pasta de modelos não encontrada: %s", self.pasta)
            return

        for arquivo_meta in sorted(self.pasta.glob("*.json")):
            try:
                meta = json.loads(arquivo_meta.read_text(encoding="utf-8"))
                arquivo_onnx = self.pasta / meta.get("arquivo_onnx", f"{arquivo_meta.stem}.onnx")
                sessao = ort.InferenceSession(str(arquivo_onnx), providers=["CPUExecutionProvider"])
                modelo = ModeloCarregado(
                    id=meta["id"],
                    cancer=meta["cancer"],
                    modo=meta["modo"],
                    tamanho=int(meta["tamanho"]),
                    escala=float(meta["escala"]),
                    classes=list(meta["classes"]),
                    sessao=sessao,
                    descricao=meta.get("descricao", ""),
                    metricas=meta.get("metricas", {}),
                )
            except Exception:
                log.exception("Modelo ignorado: %s", arquivo_meta.name)
                continue
            self.modelos[modelo.id] = modelo
            log.info("Modelo carregado: %s (%s, %s)", modelo.id, modelo.cancer, modelo.modo)

    def listar(self) -> list[ModeloCarregado]:
        return sorted(self.modelos.values(), key=lambda modelo: (modelo.cancer, modelo.modo))

    def obter(self, modelo_id: str) -> ModeloCarregado | None:
        return self.modelos.get(modelo_id)
