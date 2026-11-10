"""Converte um modelo salvo pelo notebook (.pt) em <id>.onnx + <id>.json na pasta models/ do ai-service.

Uso (de dentro de ai-service/):
    python scripts/export_onnx.py caminho/modelos_pt/oral_cor.pt
    python scripts/export_onnx.py caminho/modelos_pt/oral_cor.pt --id oral_color --output models

O .pt é o dicionário salvo pela seção "Salvar o modelo final" dos notebooks (chaves em português:
cancer, modo, class_names, escala, metricas, descricao). Se for só o state_dict, passe também
--cancer-type, --mode, --classes e --scale.

Precisa do PyTorch, fora do requirements.txt para não pesar a imagem (veja o README).
"""

import argparse
import json
import sys
import unicodedata
from pathlib import Path

import numpy as np
import onnxruntime as ort
import torch
from torch.nn import AdaptiveAvgPool2d, Conv2d, Dropout, Flatten, Linear, MaxPool2d, Module, ReLU, Sequential

SERVICE_DIR = Path(__file__).resolve().parents[1]
# Nomes dos notebooks (português) -> identificadores do sistema
CANCER_TYPES = {"pele": "skin", "oral": "oral", "cerebro": "brain"}
METRIC_KEYS = {"acc_media": "accuracy_mean", "acc_desvio": "accuracy_std", "f1_media": "f1_mean", "f1_desvio": "f1_std"}


class CustomModel(Module):
    """Mesma arquitetura dos notebooks. Os nomes (self.net) precisam ser iguais para o state_dict carregar."""

    def __init__(self, channels: int, num_classes: int) -> None:
        super().__init__()
        self.net = Sequential(
            Conv2d(channels, 16, kernel_size=3, padding=1),
            ReLU(),
            MaxPool2d(kernel_size=2),
            Conv2d(16, 32, kernel_size=3, padding=1),
            ReLU(),
            MaxPool2d(kernel_size=2),
            Conv2d(32, 64, kernel_size=3, padding=1),
            ReLU(),
            MaxPool2d(kernel_size=2),
            AdaptiveAvgPool2d(1),
            Flatten(),
            Dropout(p=0.25),
            Linear(64, num_classes),
        )

    def forward(self, x):
        return self.net(x)


def to_cancer_type(name: str) -> str:
    plain = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().strip().lower()
    return CANCER_TYPES.get(plain, plain.replace(" ", "_"))


def to_mode(mode: str) -> str:
    mode = mode.strip().lower()
    if mode in ("cor", "rgb", "color"):
        return "color"
    if mode in ("cinza", "gray", "grayscale"):
        return "gray"
    raise ValueError(f"Modo desconhecido: {mode!r} (use 'color' ou 'gray')")


def read_checkpoint(path: Path, args: argparse.Namespace) -> dict:
    data = torch.load(path, map_location="cpu", weights_only=True)

    if "state_dict" not in data:
        # Arquivo com só os pesos: o resto vem da linha de comando
        missing = [name for name in ("cancer_type", "mode", "classes", "scale") if getattr(args, name) is None]
        if missing:
            sys.exit(f"O .pt tem só o state_dict. Informe: {', '.join('--' + n.replace('_', '-') for n in missing)}")
        data = {"state_dict": data}

    return {
        "state_dict": data["state_dict"],
        "cancer_type": args.cancer_type or to_cancer_type(data["cancer"]),
        "mode": to_mode(args.mode or data["modo"]),
        "classes": args.classes or list(data["class_names"]),
        "size": int(args.size or data.get("size", 128)),
        "scale": float(args.scale if args.scale is not None else data["escala"]),
        "metrics": {METRIC_KEYS.get(k, k): v for k, v in data.get("metricas", {}).items()},
        "description": args.description or data.get("descricao", ""),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("checkpoint", type=Path)
    parser.add_argument("--id", help="padrão: <cancer_type>_<mode>, ex.: oral_color")
    parser.add_argument("--output", type=Path, default=SERVICE_DIR / "models")
    parser.add_argument("--cancer-type")
    parser.add_argument("--mode")
    parser.add_argument("--classes", nargs="+")
    parser.add_argument("--scale", type=float, help="255 se treinou com normalizar=True, 1 se não")
    parser.add_argument("--size", type=int)
    parser.add_argument("--description")
    args = parser.parse_args()

    info = read_checkpoint(args.checkpoint, args)
    model_id = args.id or f"{info['cancer_type']}_{info['mode']}"
    channels = 3 if info["mode"] == "color" else 1

    model = CustomModel(channels, len(info["classes"]))
    model.load_state_dict(info["state_dict"])
    model.eval()  # desliga o Dropout

    args.output.mkdir(parents=True, exist_ok=True)
    onnx_path = args.output / f"{model_id}.onnx"

    # Entrada de exemplo no mesmo intervalo do treino: [0, 1] normalizado ou [0, 255] sem normalizar
    torch.manual_seed(0)
    sample = torch.rand(1, channels, info["size"], info["size"]) * (255.0 / info["scale"])
    # external_data=False: pesos dentro do próprio .onnx, sem um .onnx.data separado para perder
    torch.onnx.export(model, (sample,), str(onnx_path), input_names=["image"], output_names=["logits"], external_data=False)

    # Confere se o ONNX dá a mesma saída que o PyTorch
    with torch.no_grad():
        expected = model(sample).numpy()
    session = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
    actual = session.run(None, {session.get_inputs()[0].name: sample.numpy()})[0]
    difference = float(np.abs(expected - actual).max())
    if not np.allclose(expected, actual, rtol=1e-3, atol=1e-4):
        sys.exit(f"ONNX diferente do PyTorch (diferença máxima {difference:.2e}). Arquivo não confiável: {onnx_path}")

    metadata = {
        "id": model_id,
        "cancer_type": info["cancer_type"],
        "mode": info["mode"],
        "size": info["size"],
        "scale": info["scale"],
        "classes": info["classes"],
        "description": info["description"],
        "metrics": info["metrics"],
        "onnx_file": onnx_path.name,
    }
    (args.output / f"{model_id}.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Exportado: {onnx_path} ({onnx_path.stat().st_size / 1024:.0f} KB)")
    print(f"Diferença máxima PyTorch x ONNX: {difference:.2e}")


if __name__ == "__main__":
    main()
