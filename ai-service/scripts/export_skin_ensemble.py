"""Converte o ensemble da Pele (5 EfficientNet-B0 calibradas) em um único models/skin_color.onnx + .json.

Uso (de dentro de ai-service/):
    python scripts/export_skin_ensemble.py caminho/HAM10000_PACOTE_INFERENCIA

O ONNX já contém os 5 modelos, a calibração de Platt de cada um e a média. A saída é a probabilidade
calibrada de "malignant" (mel + bcc). O limiar de decisão fica no .json e é aplicado pelo backend.

Precisa do PyTorch e do torchvision, fora do requirements.txt para não pesar a imagem (veja o README).
"""

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import onnxruntime as ort
import torch
from torch.nn import Linear, Module, ModuleList
from torchvision.models import efficientnet_b0

SERVICE_DIR = Path(__file__).resolve().parents[1]
ARTIFACTS_DIR = Path("artifacts") / "ham10000_binary_ensemble"


def build_network(state_dict: dict) -> Module:
    network = efficientnet_b0(weights=None)
    network.classifier[1] = Linear(network.classifier[1].in_features, 1)
    network.load_state_dict(state_dict, strict=True)
    return network.eval()  # desliga Dropout e fixa o BatchNorm


class CalibratedEnsemble(Module):
    """Mesma conta do EnsemblePredictor do pacote: sigmoid(slope * logit + intercept) de cada modelo e a média."""

    def __init__(self, networks: list[Module], slopes: list[float], intercepts: list[float]) -> None:
        super().__init__()
        self.networks = ModuleList(networks)
        self.register_buffer("slopes", torch.tensor(slopes, dtype=torch.float32))
        self.register_buffer("intercepts", torch.tensor(intercepts, dtype=torch.float32))

    def forward(self, x):
        logits = torch.cat([network(x).reshape(-1) for network in self.networks])
        return torch.sigmoid(self.slopes * logits + self.intercepts).mean().reshape(1)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("package", type=Path, help="pasta HAM10000_PACOTE_INFERENCIA")
    parser.add_argument("--id", default="skin_color")
    parser.add_argument("--output", type=Path, default=SERVICE_DIR / "models")
    args = parser.parse_args()

    artifacts = args.package / ARTIFACTS_DIR
    config = json.loads((artifacts / "ensemble_config.json").read_text(encoding="utf-8"))
    if config["architecture"] != "efficientnet_b0":
        sys.exit(f"Arquitetura não prevista: {config['architecture']}")

    networks, slopes, intercepts = [], [], []
    for fold in config["fold_models"]:
        checkpoint = torch.load(artifacts / "checkpoints" / fold["checkpoint"], map_location="cpu", weights_only=True)
        networks.append(build_network(checkpoint["state_dict"]))
        slopes.append(float(checkpoint["calibration"]["slope"]))
        intercepts.append(float(checkpoint["calibration"]["intercept"]))
    model = CalibratedEnsemble(networks, slopes, intercepts).eval()

    size = int(config["image_size"])
    args.output.mkdir(parents=True, exist_ok=True)
    onnx_path = args.output / f"{args.id}.onnx"

    torch.manual_seed(0)
    sample = torch.randn(1, 3, size, size)
    torch.onnx.export(model, (sample,), str(onnx_path), input_names=["image"], output_names=["malignant_probability"], external_data=False)

    # Confere se o ONNX dá a mesma saída que o PyTorch
    session = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
    difference = 0.0
    for _ in range(3):
        image = torch.randn(1, 3, size, size)
        with torch.no_grad():
            expected = model(image).numpy()
        actual = session.run(None, {session.get_inputs()[0].name: image.numpy()})[0]
        difference = max(difference, float(np.abs(expected - actual).max()))
    if difference > 1e-4:
        sys.exit(f"ONNX diferente do PyTorch (diferença máxima {difference:.2e}). Arquivo não confiável: {onnx_path}")

    metadata = {
        "id": args.id,
        "cancer_type": "skin",
        "mode": "color",
        "size": size,
        "scale": 255.0,
        "mean": config["normalization"]["mean"],
        "std": config["normalization"]["std"],
        # Ordem fixa: a saída do ONNX é a probabilidade da segunda classe
        "classes": ["benign", "malignant"],
        "threshold": config["threshold"],
        "description": (
            f"Ensemble de {len(networks)} EfficientNet-B0 calibradas. Maligno: melanoma e carcinoma basocelular. "
            "Benigno: nevo, ceratose benigna, dermatofibroma e lesão vascular. Queratose actínica (akiec) ficou fora do treino."
        ),
        "metrics": {},
        "onnx_file": onnx_path.name,
    }
    (args.output / f"{args.id}.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Exportado: {onnx_path} ({onnx_path.stat().st_size / 1024 / 1024:.1f} MB)")
    print(f"Diferença máxima PyTorch x ONNX: {difference:.2e}")


if __name__ == "__main__":
    main()
