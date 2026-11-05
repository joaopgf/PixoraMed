"""Converte o ensemble da Pele (5 EfficientNet-B0 calibradas) em um único models/pele_cor.onnx + .json.

Uso (de dentro de backend/):
    python scripts/exportar_ensemble_pele.py caminho/HAM10000_PACOTE_INFERENCIA

O ONNX já contém os 5 modelos, a calibração de Platt de cada um e a média. A saída é a probabilidade
calibrada de "maligno" (mel + bcc). O limiar de decisão fica no .json e é aplicado pela API.

Precisa do PyTorch e do torchvision (a versão CPU basta): veja requirements-dev.txt
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

RAIZ = Path(__file__).resolve().parents[2]
PASTA_ARTEFATOS = Path("artifacts") / "ham10000_binary_ensemble"


def criar_rede(state_dict: dict) -> Module:
    rede = efficientnet_b0(weights=None)
    rede.classifier[1] = Linear(rede.classifier[1].in_features, 1)
    rede.load_state_dict(state_dict, strict=True)
    return rede.eval()  # desliga Dropout e fixa o BatchNorm


class EnsembleCalibrado(Module):
    """Mesma conta do EnsemblePredictor do pacote: sigmoid(slope * logit + intercept) de cada modelo e a média."""

    def __init__(self, redes: list[Module], slopes: list[float], intercepts: list[float]) -> None:
        super().__init__()
        self.redes = ModuleList(redes)
        self.register_buffer("slopes", torch.tensor(slopes, dtype=torch.float32))
        self.register_buffer("intercepts", torch.tensor(intercepts, dtype=torch.float32))

    def forward(self, x):
        logits = torch.cat([rede(x).reshape(-1) for rede in self.redes])
        return torch.sigmoid(self.slopes * logits + self.intercepts).mean().reshape(1)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("pacote", type=Path, help="pasta HAM10000_PACOTE_INFERENCIA")
    parser.add_argument("--id", default="pele_cor")
    parser.add_argument("--saida", type=Path, default=RAIZ / "models")
    args = parser.parse_args()

    artefatos = args.pacote / PASTA_ARTEFATOS
    config = json.loads((artefatos / "ensemble_config.json").read_text(encoding="utf-8"))
    if config["architecture"] != "efficientnet_b0":
        sys.exit(f"Arquitetura não prevista: {config['architecture']}")

    redes, slopes, intercepts = [], [], []
    for fold in config["fold_models"]:
        checkpoint = torch.load(artefatos / "checkpoints" / fold["checkpoint"], map_location="cpu", weights_only=True)
        redes.append(criar_rede(checkpoint["state_dict"]))
        slopes.append(float(checkpoint["calibration"]["slope"]))
        intercepts.append(float(checkpoint["calibration"]["intercept"]))
    modelo = EnsembleCalibrado(redes, slopes, intercepts).eval()

    tamanho = int(config["image_size"])
    args.saida.mkdir(parents=True, exist_ok=True)
    arquivo_onnx = args.saida / f"{args.id}.onnx"

    torch.manual_seed(0)
    exemplo = torch.randn(1, 3, tamanho, tamanho)
    torch.onnx.export(modelo, (exemplo,), str(arquivo_onnx), input_names=["imagem"], output_names=["prob_maligno"], external_data=False)

    # Confere se o ONNX dá a mesma saída que o PyTorch
    sessao = ort.InferenceSession(str(arquivo_onnx), providers=["CPUExecutionProvider"])
    diferenca = 0.0
    for _ in range(3):
        entrada = torch.randn(1, 3, tamanho, tamanho)
        with torch.no_grad():
            esperado = modelo(entrada).numpy()
        obtido = sessao.run(None, {sessao.get_inputs()[0].name: entrada.numpy()})[0]
        diferenca = max(diferenca, float(np.abs(esperado - obtido).max()))
    if diferenca > 1e-4:
        sys.exit(f"ONNX diferente do PyTorch (diferença máxima {diferenca:.2e}). Arquivo não confiável: {arquivo_onnx}")

    meta = {
        "id": args.id,
        "cancer": "Pele",
        "modo": "cor",
        "tamanho": tamanho,
        "escala": 255.0,
        "media": config["normalization"]["mean"],
        "desvio": config["normalization"]["std"],
        # Ordem fixa: a saída do ONNX é a probabilidade da segunda classe
        "classes": ["benigno", "maligno"],
        "limiar": config["threshold"],
        "descricao": (
            f"Ensemble de {len(redes)} EfficientNet-B0 calibradas. Maligno: melanoma e carcinoma basocelular. "
            "Benigno: nevo, ceratose benigna, dermatofibroma e lesão vascular. Queratose actínica (akiec) ficou fora do treino."
        ),
        "metricas": {},
        "arquivo_onnx": arquivo_onnx.name,
    }
    (args.saida / f"{args.id}.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Exportado: {arquivo_onnx} ({arquivo_onnx.stat().st_size / 1024 / 1024:.1f} MB)")
    print(f"Diferença máxima PyTorch x ONNX: {diferenca:.2e}")


if __name__ == "__main__":
    main()
