"""Carrega os modelos ONNX da pasta models/ e devolve as probabilidades de uma imagem.

A decisão (classe final, inconclusivo, baixa certeza) não fica aqui: é do backend.
"""

import io
import json
import logging
from dataclasses import dataclass, field
from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort
from PIL import Image, ImageOps

from app.config import settings

log = logging.getLogger(__name__)

PIL_FORMATS = {"JPEG", "PNG", "WEBP", "BMP", "TIFF"}
PIL_MIN_SIDE = 100
UNREADABLE = "Não foi possível ler a imagem. Envie um arquivo JPG ou PNG."


class InvalidImage(ValueError):
    pass


@dataclass
class LoadedModel:
    id: str
    cancer_type: str
    mode: str  # "color" ou "gray"
    size: int
    scale: float  # 255 se o modelo foi treinado normalizado, 1 se não
    classes: list[str]
    session: ort.InferenceSession
    description: str = ""
    metrics: dict = field(default_factory=dict)
    # Só nos modelos com normalização própria (hoje, o ensemble da Pele)
    mean: list[float] | None = None
    std: list[float] | None = None
    # Com limiar, o ONNX devolve a probabilidade da segunda classe, já calibrada, em vez de logits
    threshold: float | None = None

    @property
    def input_name(self) -> str:
        return self.session.get_inputs()[0].name


def preprocess(content: bytes, mode: str, size: int, scale: float) -> np.ndarray:
    """Repete o load_data dos notebooks: lê com OpenCV, BGR -> RGB, resize, (C, H, W) e divide pela escala."""
    buffer = np.frombuffer(content, dtype=np.uint8)
    # Com o buffer vazio, o cv2.imdecode lança erro em vez de devolver None
    if buffer.size == 0:
        raise InvalidImage(UNREADABLE)
    flag = cv2.IMREAD_COLOR if mode == "color" else cv2.IMREAD_GRAYSCALE
    image = cv2.imdecode(buffer, flag)
    if image is None:
        raise InvalidImage(UNREADABLE)

    if mode == "color":
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    image = cv2.resize(image, (size, size))

    # (H, W, 3) -> (3, H, W) na cor; (H, W) -> (1, H, W) no cinza
    image = image.transpose(2, 0, 1) if mode == "color" else image[np.newaxis]
    return (image[np.newaxis].astype(np.float32)) / np.float32(scale)


def preprocess_pil(content: bytes, size: int, mean: list[float], std: list[float]) -> np.ndarray:
    """Repete o pacote da Pele: orientação EXIF, RGB sobre fundo branco, resize bicúbico do PIL e normalização."""
    try:
        with Image.open(io.BytesIO(content)) as source:
            if source.format not in PIL_FORMATS:
                raise InvalidImage("Formato de imagem não suportado. Envie um arquivo JPG ou PNG.")
            image = ImageOps.exif_transpose(source)
            if image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info):
                rgba = image.convert("RGBA")
                image = Image.alpha_composite(Image.new("RGBA", rgba.size, (255, 255, 255, 255)), rgba).convert("RGB")
            else:
                image = image.convert("RGB")
    except InvalidImage:
        raise
    except (OSError, ValueError, Image.DecompressionBombError) as error:
        raise InvalidImage(UNREADABLE) from error

    if min(image.size) < PIL_MIN_SIDE:
        raise InvalidImage(f"Imagem muito pequena. O mínimo é {PIL_MIN_SIDE}x{PIL_MIN_SIDE} pixels.")

    image = image.resize((size, size), Image.Resampling.BICUBIC)
    pixels = np.asarray(image, dtype=np.float32) / 255.0
    pixels = (pixels - np.array(mean, dtype=np.float32)) / np.array(std, dtype=np.float32)
    return pixels.transpose(2, 0, 1)[np.newaxis]


def softmax(logits: np.ndarray) -> np.ndarray:
    exp = np.exp(logits - logits.max())
    return exp / exp.sum()


def predict(model: LoadedModel, content: bytes) -> np.ndarray:
    """Devolve uma probabilidade para cada classe, na ordem de model.classes."""
    if model.mean is not None and model.std is not None:
        model_input = preprocess_pil(content, model.size, model.mean, model.std)
    else:
        model_input = preprocess(content, model.mode, model.size, model.scale)
    output = model.session.run(None, {model.input_name: model_input})[0]
    if model.threshold is not None:
        positive = float(output.reshape(-1)[0])
        return np.array([1.0 - positive, positive])
    return softmax(output[0])


def session_options() -> ort.SessionOptions:
    options = ort.SessionOptions()
    options.intra_op_num_threads = settings.onnx_threads
    options.inter_op_num_threads = 1
    options.add_session_config_entry("session.intra_op.allow_spinning", "0")
    return options


class ModelRegistry:
    """Cada modelo é um par <id>.onnx + <id>.json na pasta models/ (gerados por scripts/export_onnx.py)."""

    def __init__(self, folder: Path) -> None:
        self.folder = folder
        self.models: dict[str, LoadedModel] = {}

    def load(self) -> None:
        self.models.clear()
        if not self.folder.exists():
            log.warning("Pasta de modelos não encontrada: %s", self.folder)
            return

        for metadata_file in sorted(self.folder.glob("*.json")):
            try:
                metadata = json.loads(metadata_file.read_text(encoding="utf-8"))
                onnx_path = self.folder / metadata.get("onnx_file", f"{metadata_file.stem}.onnx")
                session = ort.InferenceSession(str(onnx_path), session_options(), providers=["CPUExecutionProvider"])
                model = LoadedModel(
                    id=metadata["id"],
                    cancer_type=metadata["cancer_type"],
                    mode=metadata["mode"],
                    size=int(metadata["size"]),
                    scale=float(metadata["scale"]),
                    classes=list(metadata["classes"]),
                    session=session,
                    description=metadata.get("description", ""),
                    metrics=metadata.get("metrics", {}),
                    mean=metadata.get("mean"),
                    std=metadata.get("std"),
                    threshold=metadata.get("threshold"),
                )
            except Exception:
                log.exception("Modelo ignorado: %s", metadata_file.name)
                continue
            self.models[model.id] = model
            log.info("Modelo carregado: %s (%s, %s)", model.id, model.cancer_type, model.mode)

    def list(self) -> list[LoadedModel]:
        return sorted(self.models.values(), key=lambda model: (model.cancer_type, model.mode))

    def get(self, model_id: str) -> LoadedModel | None:
        return self.models.get(model_id)
