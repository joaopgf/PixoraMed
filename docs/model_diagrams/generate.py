"""Gera as imagens dos modelos de IA usadas no guia de estudo (docs/study_guide.md).

Uso (da raiz do repositório):
    pip install torch torchvision torchview visualtorch
    python docs/model_diagrams/generate.py

Precisa também do Graphviz instalado no sistema (o programa "dot"), usado pela torchview.
As imagens mostram só a arquitetura: os pesos são aleatórios e não mudam o desenho.
"""

from pathlib import Path

import graphviz
import visualtorch
from torch.nn import AdaptiveAvgPool2d, Conv2d, Dropout, Flatten, Linear, MaxPool2d, Module, ReLU, Sequential
from torchview import draw_graph
from torchvision.models import efficientnet_b0

OUTPUT = Path(__file__).resolve().parent


class CustomModel(Module):
    """Mesma arquitetura dos notebooks e do ai-service/scripts/export_onnx.py (Oral e Cérebro)."""

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


def skin_network() -> Module:
    """Uma das 5 EfficientNet-B0 da Pele, com a última camada trocada por 1 saída (logit de maligno)."""
    network = efficientnet_b0(weights=None)
    network.classifier[1] = Linear(network.classifier[1].in_features, 1)
    return network.eval()


def torchview_png(model: Module, input_size: tuple, name: str, depth: int) -> None:
    graph = draw_graph(model, input_size=input_size, depth=depth, expand_nested=True, graph_name=name, roll=True)
    graph.visual_graph.attr(dpi="150")
    graph.visual_graph.render(filename=name, directory=OUTPUT, format="png", cleanup=True)


def ensemble_flow() -> None:
    """Caminho de uma imagem de pele: pré-processamento, 5 redes, calibração de Platt, média e limiar."""
    graph = graphviz.Digraph("skin_ensemble_flow", graph_attr={"rankdir": "LR", "dpi": "150", "nodesep": "0.25"})
    graph.attr("node", shape="box", style="rounded,filled", fontname="Helvetica", fontsize="11")
    graph.node("img", "Imagem enviada", fillcolor="#fff6d5")
    graph.node("pre", "Pré-processamento\nRGB, 224×224,\nnormalização ImageNet", fillcolor="#e8f0fe")
    graph.edge("img", "pre")
    with graph.subgraph(name="cluster_onnx") as onnx:
        onnx.attr(label="skin_color.onnx", style="dashed", fontname="Helvetica")
        onnx.node("mean", "Média das 5\nprobabilidades", fillcolor="#e8f0fe")
        for i in range(1, 6):
            onnx.node(f"net{i}", f"EfficientNet-B0 {i}", fillcolor="#c8f0c8")
            onnx.node(f"cal{i}", f"Platt {i}\nsigmoid(a·logit + b)", fillcolor="#c8f0c8")
            onnx.edge(f"net{i}", f"cal{i}", label="logit", fontsize="9")
            onnx.edge(f"cal{i}", "mean")
            graph.edge("pre", f"net{i}")
    graph.node("dec", "Backend (DecisionService)\nmaligno se ≥ 18%", fillcolor="#fde2e2")
    graph.edge("mean", "dec", label="probabilidade\nde maligno", fontsize="9")
    graph.render(filename="skin_ensemble_flow", directory=OUTPUT, format="png", cleanup=True)


def main() -> None:
    oral = CustomModel(channels=3, num_classes=2).eval()

    # 1. Blocos em 3D (estilo visualkeras): o tamanho de cada bloco é o tamanho do tensor
    visualtorch.layered_view(
        oral, input_shape=(1, 3, 128, 128), legend=True, spacing=25, scale_xy=2.5, scale_z=0.6, max_xy=300
    ).save(OUTPUT / "cnn_oral_layers.png")

    # 2. Grafo com o formato do tensor em cada camada
    torchview_png(oral, (1, 3, 128, 128), "cnn_oral_graph", depth=3)

    # 3. EfficientNet-B0 da Pele: visão geral (os 7 estágios de blocos MBConv fechados)
    skin = skin_network()
    torchview_png(skin, (1, 3, 224, 224), "efficientnet_b0_overview", depth=2)

    # 4. Um bloco MBConv aberto (primeiro bloco do 2º estágio: 16 -> 24 canais)
    torchview_png(skin.features[2][0], (1, 16, 112, 112), "efficientnet_b0_mbconv_block", depth=4)

    # 5. Fluxo do ensemble da Pele, desenhado à mão com o Graphviz
    ensemble_flow()

    for path in sorted(OUTPUT.glob("*.png")):
        print(f"Gerado: {path.name}")


if __name__ == "__main__":
    main()
