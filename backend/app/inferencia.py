"""Carrega os modelos ONNX da pasta models/ e faz a previsão de uma imagem."""

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

FORMATOS_PIL = {"JPEG", "PNG", "WEBP", "BMP", "TIFF"}
LADO_MINIMO_PIL = 100
CLASSE_INCONCLUSIVA = "inconclusivo"


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
    # Só nos modelos com normalização própria (hoje, o ensemble da Pele)
    media: list[float] | None = None
    desvio: list[float] | None = None
    # Com limiar, o ONNX devolve a probabilidade da segunda classe, já calibrada, em vez de logits
    limiar: float | None = None

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


def preprocessar_pil(conteudo: bytes, tamanho: int, media: list[float], desvio: list[float]) -> np.ndarray:
    """Repete o pacote da Pele: orientação EXIF, RGB sobre fundo branco, resize bicúbico do PIL e normalização."""
    try:
        with Image.open(io.BytesIO(conteudo)) as origem:
            if origem.format not in FORMATOS_PIL:
                raise ImagemInvalida("Formato de imagem não suportado. Envie um arquivo JPG ou PNG.")
            imagem = ImageOps.exif_transpose(origem)
            if imagem.mode in ("RGBA", "LA") or (imagem.mode == "P" and "transparency" in imagem.info):
                rgba = imagem.convert("RGBA")
                imagem = Image.alpha_composite(Image.new("RGBA", rgba.size, (255, 255, 255, 255)), rgba).convert("RGB")
            else:
                imagem = imagem.convert("RGB")
    except ImagemInvalida:
        raise
    except (OSError, ValueError, Image.DecompressionBombError) as erro:
        raise ImagemInvalida("Não foi possível ler a imagem. Envie um arquivo JPG ou PNG.") from erro

    if min(imagem.size) < LADO_MINIMO_PIL:
        raise ImagemInvalida(f"Imagem muito pequena. O mínimo é {LADO_MINIMO_PIL}x{LADO_MINIMO_PIL} pixels.")

    imagem = imagem.resize((tamanho, tamanho), Image.Resampling.BICUBIC)
    pixels = np.asarray(imagem, dtype=np.float32) / 255.0
    pixels = (pixels - np.array(media, dtype=np.float32)) / np.array(desvio, dtype=np.float32)
    return pixels.transpose(2, 0, 1)[np.newaxis]


def softmax(logits: np.ndarray) -> np.ndarray:
    exp = np.exp(logits - logits.max())
    return exp / exp.sum()


def prever(modelo: ModeloCarregado, conteudo: bytes) -> np.ndarray:
    """Devolve uma probabilidade para cada classe, na ordem de modelo.classes."""
    if modelo.media is not None and modelo.desvio is not None:
        entrada = preprocessar_pil(conteudo, modelo.tamanho, modelo.media, modelo.desvio)
    else:
        entrada = preprocessar(conteudo, modelo.modo, modelo.tamanho, modelo.escala)
    saida = modelo.sessao.run(None, {modelo.nome_entrada: entrada})[0]
    if modelo.limiar is not None:
        positiva = float(saida.reshape(-1)[0])
        return np.array([1.0 - positiva, positiva])
    return softmax(saida[0])


def indice_previsto(modelo: ModeloCarregado, probabilidades: np.ndarray) -> int:
    """A classe mais provável ou, se o modelo tiver limiar, a segunda classe quando a probabilidade dela o alcança."""
    if modelo.limiar is not None:
        return 1 if probabilidades[1] >= modelo.limiar else 0
    return int(probabilidades.argmax())


def limiar_inconclusivo_do_modelo(modelo: ModeloCarregado) -> float | None:
    """Modelos com limiar próprio já decidem por ele; os demais ficam inconclusivos abaixo do limiar configurado."""
    return None if modelo.limiar is not None else settings.limiar_inconclusivo


def limiar_baixa_certeza_do_modelo(modelo: ModeloCarregado) -> float | None:
    """Modelos com limiar próprio mantêm a classe, mas a tela avisa quando nenhuma classe alcança este valor."""
    return settings.limiar_inconclusivo if modelo.limiar is not None else None


def opcoes_sessao() -> ort.SessionOptions:
    opcoes = ort.SessionOptions()
    opcoes.intra_op_num_threads = settings.onnx_threads
    opcoes.inter_op_num_threads = 1
    opcoes.add_session_config_entry("session.intra_op.allow_spinning", "0")
    return opcoes


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
                sessao = ort.InferenceSession(str(arquivo_onnx), opcoes_sessao(), providers=["CPUExecutionProvider"])
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
                    media=meta.get("media"),
                    desvio=meta.get("desvio"),
                    limiar=meta.get("limiar"),
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
