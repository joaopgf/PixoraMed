"""Converte um modelo salvo pelo notebook (.pt) em <id>.onnx + <id>.json para a pasta models/.

Uso (de dentro de backend/):
    python scripts/exportar_onnx.py ../modelos_pt/mama_cor.pt
    python scripts/exportar_onnx.py ../modelos_pt/mama_cor.pt --id mama_cor --saida ../models

O .pt é o dicionário salvo pela célula de docs/salvar_modelo.md. Se for só o state_dict,
passe também --cancer, --modo, --classes e --escala.

Precisa do PyTorch (a versão CPU basta) e do onnx/onnxscript: pip install -r requirements-dev.txt
"""

import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path

import numpy as np
import onnxruntime as ort
import torch
from torch.nn import AdaptiveAvgPool2d, Conv2d, Dropout, Flatten, Linear, MaxPool2d, Module, ReLU, Sequential

RAIZ = Path(__file__).resolve().parents[2]


class CustomModel(Module):
    """Mesma arquitetura dos notebooks. Os nomes (self.net) precisam ser iguais para o state_dict carregar."""

    def __init__(self, canais: int, n_classes: int) -> None:
        super().__init__()
        self.net = Sequential(
            Conv2d(canais, 16, kernel_size=3, padding=1),
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
            Linear(64, n_classes),
        )

    def forward(self, x):
        return self.net(x)


def slug(texto: str) -> str:
    sem_acento = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "_", sem_acento.lower()).strip("_")


def normalizar_modo(modo: str) -> str:
    modo = modo.strip().lower()
    if modo in ("cor", "rgb"):
        return "cor"
    if modo in ("cinza", "gray", "grayscale"):
        return "cinza"
    raise ValueError(f"Modo desconhecido: {modo!r} (use 'cor' ou 'cinza')")


def ler_checkpoint(caminho: Path, args: argparse.Namespace) -> dict:
    dados = torch.load(caminho, map_location="cpu", weights_only=True)

    if "state_dict" not in dados:
        # Arquivo com só os pesos: o resto vem da linha de comando
        faltando = [nome for nome in ("cancer", "modo", "classes", "escala") if getattr(args, nome) is None]
        if faltando:
            sys.exit(f"O .pt tem só o state_dict. Informe: {', '.join('--' + nome for nome in faltando)}")
        dados = {"state_dict": dados}

    return {
        "state_dict": dados["state_dict"],
        "cancer": args.cancer or dados["cancer"],
        "modo": normalizar_modo(args.modo or dados["modo"]),
        "classes": args.classes or list(dados["class_names"]),
        "tamanho": int(args.tamanho or dados.get("size", 128)),
        "escala": float(args.escala if args.escala is not None else dados["escala"]),
        "metricas": dados.get("metricas", {}),
        "descricao": args.descricao or dados.get("descricao", ""),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("checkpoint", type=Path)
    parser.add_argument("--id", help="padrão: <cancer>_<modo>, ex.: mama_cor")
    parser.add_argument("--saida", type=Path, default=RAIZ / "models")
    parser.add_argument("--cancer")
    parser.add_argument("--modo")
    parser.add_argument("--classes", nargs="+")
    parser.add_argument("--escala", type=float, help="255 se treinou com normalizar=True, 1 se não")
    parser.add_argument("--tamanho", type=int)
    parser.add_argument("--descricao")
    args = parser.parse_args()

    info = ler_checkpoint(args.checkpoint, args)
    modelo_id = args.id or slug(f"{info['cancer']}_{info['modo']}")
    canais = 3 if info["modo"] == "cor" else 1

    modelo = CustomModel(canais, len(info["classes"]))
    modelo.load_state_dict(info["state_dict"])
    modelo.eval()  # desliga o Dropout

    args.saida.mkdir(parents=True, exist_ok=True)
    arquivo_onnx = args.saida / f"{modelo_id}.onnx"

    # Entrada de exemplo no mesmo intervalo do treino: [0, 1] normalizado ou [0, 255] sem normalizar
    torch.manual_seed(0)
    exemplo = torch.rand(1, canais, info["tamanho"], info["tamanho"]) * (255.0 / info["escala"])
    torch.onnx.export(modelo, (exemplo,), str(arquivo_onnx), input_names=["imagem"], output_names=["logits"])

    # Confere se o ONNX dá a mesma saída que o PyTorch
    with torch.no_grad():
        esperado = modelo(exemplo).numpy()
    sessao = ort.InferenceSession(str(arquivo_onnx), providers=["CPUExecutionProvider"])
    obtido = sessao.run(None, {sessao.get_inputs()[0].name: exemplo.numpy()})[0]
    diferenca = float(np.abs(esperado - obtido).max())
    if not np.allclose(esperado, obtido, rtol=1e-3, atol=1e-4):
        sys.exit(f"ONNX diferente do PyTorch (diferença máxima {diferenca:.2e}). Arquivo não confiável: {arquivo_onnx}")

    meta = {
        "id": modelo_id,
        "cancer": info["cancer"],
        "modo": info["modo"],
        "tamanho": info["tamanho"],
        "escala": info["escala"],
        "classes": info["classes"],
        "descricao": info["descricao"],
        "metricas": info["metricas"],
        "arquivo_onnx": arquivo_onnx.name,
    }
    (args.saida / f"{modelo_id}.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Exportado: {arquivo_onnx} ({arquivo_onnx.stat().st_size / 1024:.0f} KB)")
    print(f"Diferença máxima PyTorch x ONNX: {diferenca:.2e}")


if __name__ == "__main__":
    main()
