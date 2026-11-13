"""Desenha o diagrama 3D anotado da EfficientNet-B0 da Pele, no mesmo estilo do annotated_cnn.py (slide 15 do deck).

Uso (da raiz do repositório):
    pip install pillow
    python docs/model_diagrams/annotated_efficientnet.py

Os formatos e parâmetros de cada estágio foram contados no PyTorch com a rede do app
(torchvision efficientnet_b0 com a última camada trocada por Linear(1280, 1)). O treino da
reprodução vem de Projeto-ML-Cancer/rna_cor/rna_Pele_EfficientNet.ipynb.
"""

from pathlib import Path

from PIL import Image, ImageDraw

from annotated_cnn import S, centered, draw_box, font

OUT = Path(__file__).resolve().parent / "efficientnet_skin_annotated.png"

# (nome, detalhe, tipo, formato, parâmetros, canais, lado espacial ou None se vetor, tamanho do vetor)
LAYERS = [
    ("Entrada", "imagem RGB", "input", "3 × 224 × 224", 0, 3, 224, None),
    ("Conv 3×3", "passo 2", "conv", "32 × 112 × 112", 928, 32, 112, None),
    ("Estágio 1", "MBConv1 3×3 · 1 bloco", "mbconv", "16 × 112 × 112", 1448, 16, 112, None),
    ("Estágio 2", "MBConv6 3×3 · 2 blocos", "mbconv", "24 × 56 × 56", 16714, 24, 56, None),
    ("Estágio 3", "MBConv6 5×5 · 2 blocos", "mbconv", "40 × 28 × 28", 46640, 40, 28, None),
    ("Estágio 4", "MBConv6 3×3 · 3 blocos", "mbconv", "80 × 14 × 14", 242930, 80, 14, None),
    ("Estágio 5", "MBConv6 5×5 · 3 blocos", "mbconv", "112 × 14 × 14", 543148, 112, 14, None),
    ("Estágio 6", "MBConv6 5×5 · 4 blocos", "mbconv", "192 × 7 × 7", 2026348, 192, 7, None),
    ("Estágio 7", "MBConv6 3×3 · 1 bloco", "mbconv", "320 × 7 × 7", 717232, 320, 7, None),
    ("Conv 1×1", "junta os canais", "conv", "1280 × 7 × 7", 412160, 1280, 7, None),
    ("Pooling global", "média de cada canal", "gap", "1280", 0, None, None, 1280),
    ("Dropout 20%", "só no treino", "drop", "1280", 0, None, None, 1280),
    ("Linear", "trocada pelo grupo", "linear", "1 logit", 1281, None, None, 1),
    ("Platt + sigmoid", "a · logit + b", "platt", "P(maligno)", 2, None, None, 1),
]

COLORS = {  # (frente, topo, lateral)
    "input": ("#f2b134", "#f7cd73", "#c98d1c"),
    "conv": ("#4a90d9", "#86b6e8", "#2f6fb3"),
    "mbconv": ("#3aa58c", "#7cc7b4", "#277a67"),
    "gap": ("#2a6f97", "#5a97bb", "#1d5272"),
    "drop": ("#d97fb0", "#e9a9cc", "#b35a8c"),
    "linear": ("#e07a3a", "#eda477", "#b85d24"),
    "platt": ("#d03b3b", "#e07373", "#a52a2a"),
}
LEGEND = [
    ("input", "Entrada (224×224, normalização ImageNet)"),
    ("conv", "Convolução comum"),
    ("mbconv", "MBConv: expande, filtra cada canal, SE, projeta"),
    ("gap", "Pooling global (1 número por canal)"),
    ("drop", "Dropout 20% (só no treino)"),
    ("linear", "Linear (1 logit de maligno)"),
    ("platt", "Calibração de Platt + sigmoid (probabilidade)"),
]


def block_size(channels, side, vector):
    """Largura pelo nº de canais (em escala log, 3 a 1.280 não caberia em escala linear) e altura pelo lado da imagem."""
    if vector is not None:  # vetor: barra fina
        return 14 * S, (30 + (150 if vector > 1 else 0)) * S, 8 * S
    width = (4 + 8.5 * channels.bit_length()) * S
    height = (34 + side * 1.15) * S
    depth = (10 + side * 0.36) * S
    return width, height, depth


def main():
    slot = 142 * S
    margin = 50 * S
    width = margin * 2 + slot * len(LAYERS)
    height = 1000 * S
    image = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(image)

    # Cabeçalho
    draw.text((margin, 28 * S), "EfficientNet-B0 do PixoraMed: módulo Pele", font=font(30, True), fill="#1b1b1b")
    draw.text(
        (margin, 74 * S),
        "Rede pronta do Google, pré-treinada no ImageNet  ·  4.008.829 parâmetros por rede  ·  "
        "entrada 224×224 RGB  ·  saída: probabilidade de maligno  ·  o app usa 5 redes iguais a esta",
        font=font(17),
        fill="#444444",
    )

    base_y = 430 * S
    label_y = 612 * S
    centers, edges = [], []
    for i, (name, detail, kind, shape, params, channels, side, vector) in enumerate(LAYERS):
        w, h, d = block_size(channels, side, vector)
        cx = margin + slot * i + slot / 2
        x = cx - (w + d * 0.75) / 2
        _, bottom, right = draw_box(draw, x, base_y, w, h, d, COLORS[kind])
        centers.append(cx)
        edges.append((x, right))
        draw.line([(cx, bottom + 8 * S), (cx, label_y - 10 * S)], fill="#bbbbbb", width=S)
        centered(draw, cx, label_y, name, font(15, True))
        centered(draw, cx, label_y + 24 * S, detail, font(11), "#555555")
        centered(draw, cx, label_y + 44 * S, shape, font(13), "#333333")
        param_text = f"{params:,} parâm.".replace(",", ".") if params else "sem parâmetros"
        centered(draw, cx, label_y + 66 * S, param_text, font(12), "#2f6fb3" if params else "#888888")

    # Setas entre blocos
    for (_, right), (left, _) in zip(edges, edges[1:]):
        x0, x1 = right + 6 * S, left - 6 * S
        if x1 - x0 < 16 * S:
            continue
        draw.line([(x0, base_y), (x1 - 9 * S, base_y)], fill="#999999", width=2 * S)
        draw.polygon([(x1 - 9 * S, base_y - 6 * S), (x1, base_y), (x1 - 9 * S, base_y + 6 * S)], fill="#999999")

    # Chaves de etapa acima dos blocos
    def bracket(first, last, text, sub, color):
        x0, x1 = centers[first] - slot / 2 + 10 * S, centers[last] + slot / 2 - 10 * S
        y = 175 * S
        draw.line([(x0, y + 14 * S), (x0, y), (x1, y), (x1, y + 14 * S)], fill=color, width=2 * S)
        centered(draw, (x0 + x1) / 2, y - 46 * S, text, font(16, True), color)
        centered(draw, (x0 + x1) / 2, y - 24 * S, sub, font(13), "#555555")

    bracket(1, 9, "Extração de características (pesos do ImageNet, ajustados para pele)",
            "a imagem encolhe de 224 para 7 e ganha canais: 32 → 16 → 24 → 40 → 80 → 112 → 192 → 320 → 1.280", "#277a67")
    bracket(10, 13, "Classificação", "1.280 números → 1 probabilidade", "#b85d24")

    # Destaque dos parâmetros
    draw.text(
        (margin, 718 * S),
        "Onde estão os parâmetros: Estágio 6 = 2,03 mi (50,5%)  ·  Estágio 7 = 0,72 mi (17,9%)  ·  "
        "Estágio 5 = 0,54 mi (13,5%)  ·  Conv 1×1 = 0,41 mi (10,3%)  ·  início da rede = 0,31 mi (7,7%)  ·  "
        "Linear = 1.281 (0,03%)",
        font=font(16, True),
        fill="#2f6fb3",
    )

    # Caixa de treino e resultado
    box = [margin, 755 * S, width - margin, 880 * S]
    draw.rounded_rectangle(box, radius=10 * S, fill="#f4f6f9", outline="#c9d1dc", width=S)
    rows = [
        ("Modelo do app",
         "Transfer learning: parte dos pesos do ImageNet e foi ajustada com o HAM10000  ·  última camada trocada de "
         "1.000 classes para 1 saída  ·  5 redes (uma por fold)  ·  código do treino original perdido"),
        ("Reprodução",
         "PyTorch no Colab  ·  otimizador AdamW (taxa 0,0003)  ·  lote 32  ·  até 12 épocas  ·  perda BCEWithLogitsLoss "
         "com peso maior para maligno  ·  espelho, rotação 15° e leve ajuste de cor"),
        ("Resultado e uso",
         "App: 8 de 8 malignos e 7 de 13 benignos (21 imagens)  ·  reprodução: AUC 0,939 em 1.915 imagens  ·  "
         "média das 5 redes, maligno a partir de 18%  ·  1,7 s por imagem em CPU (~80 MB)"),
    ]
    for i, (title, text) in enumerate(rows):
        y = (768 + i * 36) * S
        draw.text((margin + 20 * S, y), title, font=font(15, True), fill="#1b1b1b")
        draw.text((margin + 175 * S, y), text, font=font(14), fill="#333333")

    # Legenda
    lx, ly = margin, 910 * S
    for i, (kind, text) in enumerate(LEGEND):
        col, row = i % 4, i // 4
        x = lx + col * 500 * S
        y = ly + row * 36 * S
        draw_box(draw, x, y + 10 * S, 16 * S, 16 * S, 8 * S, COLORS[kind])
        draw.text((x + 34 * S, y), text, font=font(14), fill="#333333")

    image.save(OUT)
    print(OUT, image.size)


if __name__ == "__main__":
    main()
