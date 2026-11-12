"""Desenha o diagrama 3D anotado da CNN da Oral usado no guia de estudo (docs/study_guide.md).

Uso (da raiz do repositório):
    pip install pillow
    python docs/model_diagrams/annotated_cnn.py

Desenhado com o Pillow, no estilo de blocos da VisualTorch, para poder escrever os dados de cada
camada (formato, parâmetros), as etapas da rede, o treino e o resultado. Usa a fonte Segoe UI do
Windows. Os números vêm do guia e do backend/src/main/resources/data/training-results.csv.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

S = 2  # escala para a imagem sair nítida
OUT = Path(__file__).resolve().parent / "cnn_oral_annotated.png"
FONTS = "C:/Windows/Fonts/"


def font(size, bold=False):
    return ImageFont.truetype(FONTS + ("segoeuib.ttf" if bold else "segoeui.ttf"), size * S)


# (nome, tipo, formato, parâmetros, canais, lado espacial ou None se vetor, tamanho do vetor)
LAYERS = [
    ("Entrada", "input", "3 × 128 × 128", 0, 3, 128, None),
    ("Conv 3×3 + ReLU", "conv", "16 × 128 × 128", 448, 16, 128, None),
    ("MaxPool 2×2", "pool", "16 × 64 × 64", 0, 16, 64, None),
    ("Conv 3×3 + ReLU", "conv", "32 × 64 × 64", 4640, 32, 64, None),
    ("MaxPool 2×2", "pool", "32 × 32 × 32", 0, 32, 32, None),
    ("Conv 3×3 + ReLU", "conv", "64 × 32 × 32", 18496, 64, 32, None),
    ("MaxPool 2×2", "pool", "64 × 16 × 16", 0, 64, 16, None),
    ("Pooling global", "gap", "64", 0, None, None, 64),
    ("Dropout 25%", "drop", "64", 0, None, None, 64),
    ("Linear", "linear", "2", 130, None, None, 2),
    ("Softmax", "softmax", "2 probabilidades", 0, None, None, 2),
]

COLORS = {  # (frente, topo, lateral)
    "input": ("#f2b134", "#f7cd73", "#c98d1c"),
    "conv": ("#4a90d9", "#86b6e8", "#2f6fb3"),
    "pool": ("#e6cf3a", "#f0e07a", "#bba51f"),
    "gap": ("#2a6f97", "#5a97bb", "#1d5272"),
    "drop": ("#d97fb0", "#e9a9cc", "#b35a8c"),
    "linear": ("#e07a3a", "#eda477", "#b85d24"),
    "softmax": ("#d03b3b", "#e07373", "#a52a2a"),
}
LEGEND = [
    ("input", "Entrada (imagem RGB)"),
    ("conv", "Convolução 3×3 + ReLU (aprende filtros)"),
    ("pool", "MaxPool 2×2 (reduz pela metade)"),
    ("gap", "Pooling global (1 número por filtro)"),
    ("drop", "Dropout 25% (só no treino)"),
    ("linear", "Linear (1 logit por classe)"),
    ("softmax", "Softmax (probabilidades)"),
]


def block_size(channels, side, vector):
    if vector is not None:  # vetor: barra fina, altura pelo tamanho
        return 16 * S, (24 + vector * 1.6) * S, 10 * S
    width = (10 + channels * 0.9) * S
    height = (40 + side * 1.85) * S
    depth = (12 + side * 0.55) * S
    return width, height, depth


def draw_box(draw, x, base_y, w, h, d, colors):
    front, top, side = colors
    dx, dy = d * 0.75, d * 0.55
    y0 = base_y - h / 2 + dy / 2
    y1 = y0 + h
    outline = "#333333"
    draw.polygon([(x, y0), (x + dx, y0 - dy), (x + w + dx, y0 - dy), (x + w, y0)], fill=top, outline=outline)
    draw.polygon([(x + w, y0), (x + w + dx, y0 - dy), (x + w + dx, y1 - dy), (x + w, y1)], fill=side, outline=outline)
    draw.rectangle([x, y0, x + w, y1], fill=front, outline=outline)
    return y0 - dy, y1, x + w + dx


def centered(draw, cx, y, text, fnt, fill="#222222"):
    width = draw.textlength(text, font=fnt)
    draw.text((cx - width / 2, y), text, font=fnt, fill=fill)


def main():
    slot = 168 * S
    margin = 60 * S
    width = margin * 2 + slot * len(LAYERS)
    height = 1000 * S
    image = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(image)

    # Cabeçalho
    draw.text((margin, 28 * S), "CNN do PixoraMed: módulo Oral (cor)", font=font(30, True), fill="#1b1b1b")
    draw.text(
        (margin, 74 * S),
        "Treinada do zero  ·  23.714 parâmetros (~110 KB)  ·  entrada 128×128 RGB  ·  "
        "saída: normal ou carcinoma espinocelular (scc)",
        font=font(17),
        fill="#444444",
    )

    base_y = 420 * S
    label_y = 600 * S
    centers = []
    tops = []
    edges = []
    for i, (name, kind, shape, params, channels, side, vector) in enumerate(LAYERS):
        w, h, d = block_size(channels, side, vector)
        cx = margin + slot * i + slot / 2
        x = cx - (w + d * 0.75) / 2
        top, bottom, right = draw_box(draw, x, base_y, w, h, d, COLORS[kind])
        centers.append(cx)
        edges.append((x, right))
        tops.append(top)
        # Linha guia até o rótulo
        draw.line([(cx, bottom + 8 * S), (cx, label_y - 10 * S)], fill="#bbbbbb", width=S)
        centered(draw, cx, label_y, name, font(15, True))
        centered(draw, cx, label_y + 26 * S, shape, font(14), "#333333")
        param_text = f"{params:,} parâm.".replace(",", ".") if params else "sem parâmetros"
        centered(draw, cx, label_y + 50 * S, param_text, font(13), "#2f6fb3" if params else "#888888")

    # Setas entre blocos
    for (_, right), (left, _) in zip(edges, edges[1:]):
        y = base_y
        x0, x1 = right + 8 * S, left - 8 * S
        draw.line([(x0, y), (x1 - 10 * S, y)], fill="#999999", width=2 * S)
        draw.polygon([(x1 - 10 * S, y - 6 * S), (x1, y), (x1 - 10 * S, y + 6 * S)], fill="#999999")

    # Chaves de etapa acima dos blocos
    def bracket(first, last, text, sub, color):
        x0, x1 = centers[first] - slot / 2 + 12 * S, centers[last] + slot / 2 - 12 * S
        y = 175 * S
        draw.line([(x0, y + 14 * S), (x0, y), (x1, y), (x1, y + 14 * S)], fill=color, width=2 * S)
        centered(draw, (x0 + x1) / 2, y - 46 * S, text, font(16, True), color)
        centered(draw, (x0 + x1) / 2, y - 24 * S, sub, font(13), "#555555")

    bracket(1, 6, "Extração de características", "a imagem encolhe e ganha filtros: 16 → 32 → 64", "#2f6fb3")
    bracket(7, 10, "Classificação", "64 números → 2 classes", "#b85d24")

    # Destaque dos parâmetros
    draw.text(
        (margin, 700 * S),
        "Onde estão os parâmetros: Conv 1 = 448 (1,9%)  ·  Conv 2 = 4.640 (19,6%)  ·  "
        "Conv 3 = 18.496 (78,0%)  ·  Linear = 130 (0,5%)",
        font=font(16, True),
        fill="#2f6fb3",
    )

    # Caixa de treino e resultado
    box = [margin, 745 * S, width - margin, 850 * S]
    draw.rounded_rectangle(box, radius=10 * S, fill="#f4f6f9", outline="#c9d1dc", width=S)
    draw.text((margin + 20 * S, 758 * S), "Treino", font=font(15, True), fill="#1b1b1b")
    draw.text(
        (margin + 20 * S, 782 * S),
        "PyTorch  ·  otimizador Adam (taxa 0,001)  ·  lote 64  ·  450 épocas  ·  perda CrossEntropyLoss  ·  "
        "validação cruzada estratificada em 5 folds (semente 42)  ·  2.000 imagens (1.000 por classe)",
        font=font(14),
        fill="#333333",
    )
    draw.text((margin + 20 * S, 810 * S), "Resultado e uso", font=font(15, True), fill="#1b1b1b")
    draw.text(
        (margin + 160 * S, 810 * S),
        "96,5% de acerto (193/200) em imagens separadas da mesma fonte  ·  inconclusivo abaixo de 80% de confiança  ·  "
        "0,2 s por imagem em CPU (ONNX Runtime)",
        font=font(14),
        fill="#333333",
    )

    # Legenda
    lx, ly = margin, 880 * S
    for i, (kind, text) in enumerate(LEGEND):
        col, row = i % 4, i // 4
        x = lx + col * 420 * S
        y = ly + row * 36 * S
        draw_box(draw, x, y + 10 * S, 16 * S, 16 * S, 8 * S, COLORS[kind])
        draw.text((x + 34 * S, y), text, font=font(14), fill="#333333")

    image.save(OUT)
    print(OUT, image.size)


if __name__ == "__main__":
    main()
