# Gera o DER lógico do PixoraMed (docs/der/pixoramed_der.png) a partir das entidades do backend.
# Uso: python docs/der/generate_der.py   (precisa do Pillow)
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

S = 2  # escala, para a imagem ficar nítida
OUT = Path(__file__).with_name("pixoramed_der.png")
FONTS = Path("C:/Windows/Fonts")


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    try:
        return ImageFont.truetype(str(FONTS / name), size * S)
    except OSError:
        return ImageFont.load_default(size * S)


F_TITLE = font("segoeuib.ttf", 30)
F_SUB = font("segoeui.ttf", 17)
F_HEAD = font("segoeuib.ttf", 21)
F_HEAD_SUB = font("segoeui.ttf", 15)
F_ROW = font("segoeui.ttf", 16)
F_ROW_B = font("segoeuib.ttf", 16)
F_TAG = font("segoeuib.ttf", 12)
F_NOTE = font("segoeui.ttf", 15)
F_CARD = font("segoeuib.ttf", 20)

INK, MUTED, LINE = "#1f2933", "#6b7785", "#c9d1dc"
COLORS = {"users": "#2f6db3", "predictions": "#2f8f6b", "trainings": "#8a5a2b"}
TAG_COLORS = {"PK": "#c98a00", "FK": "#2f6db3", "UK": "#7a4fb3"}

# (marcador, coluna, tipo) igual ao banco gerado pelo Hibernate
ENTITIES = {
    "users": ("Usuário", [
        ("PK", "id", "bigint"),
        ("", "name", "varchar(255)"),
        ("UK", "email", "varchar(254)"),
        ("", "password_hash", "varchar(100) · hash BCrypt"),
        ("", "created_at", "timestamptz"),
    ]),
    "predictions": ("Análise (histórico)", [
        ("PK", "id", "bigint"),
        ("FK", "user_id", "bigint → users.id"),
        ("", "model_id", "varchar(60)"),
        ("", "predicted_class", "varchar(60)"),
        ("", "confidence", "double"),
        ("", "probabilities", "text · JSON por classe"),
        ("", "time_ms", "double"),
        ("", "created_at", "timestamptz"),
    ]),
    "trainings": ("Treino (importado do CSV)", [
        ("PK", "id", "bigint"),
        ("UK", "run_at", "timestamp"),
        ("UK", "dataset", "varchar(255)"),
        ("", "cancer_type", "varchar(255)"),
        ("", "variant", "varchar(255)"),
        ("", "mode", "varchar(255)"),
        ("", "normalized", "boolean"),
        ("", "total_images", "integer"),
        ("", "images_per_class", "varchar(500)"),
        ("", "image_size", "varchar(255)"),
        ("", "epochs", "integer"),
        ("", "batch_size", "integer"),
        ("", "learning_rate", "double"),
        ("", "folds", "varchar(255)"),
        ("", "gpu", "varchar(255)"),
        ("", "total_time", "varchar(255)"),
        ("", "total_seconds", "integer"),
        ("", "accuracy_mean", "double"),
        ("", "accuracy_std", "double"),
        ("", "accuracy_per_fold", "varchar(255)"),
        ("", "f1_mean", "double"),
        ("", "f1_std", "double"),
        ("", "f1_per_fold", "varchar(255)"),
    ]),
}

W, H = 2240, 1250
HEAD_H, ROW_H, BOX_W = 74, 40, 560
POS = {"users": (70, 190), "predictions": (800, 190), "trainings": (1610, 190)}


def draw_entity(draw: ImageDraw.ImageDraw, key: str) -> dict[str, int]:
    """Desenha a tabela e devolve o centro vertical de cada coluna (para ligar a relação)."""
    x, y = POS[key]
    label, rows = ENTITIES[key]
    color = COLORS[key]
    h = HEAD_H + ROW_H * len(rows)
    box = [x * S, y * S, (x + BOX_W) * S, (y + h) * S]
    draw.rounded_rectangle([b + 5 * S for b in box], radius=10 * S, fill="#e3e7ec")  # sombra
    draw.rounded_rectangle(box, radius=10 * S, fill="white", outline=color, width=2 * S)
    draw.rounded_rectangle([x * S, y * S, (x + BOX_W) * S, (y + HEAD_H) * S], radius=10 * S, fill=color)
    draw.rectangle([x * S, (y + HEAD_H - 12) * S, (x + BOX_W) * S, (y + HEAD_H) * S], fill=color)
    draw.text(((x + 18) * S, (y + 10) * S), key, font=F_HEAD, fill="white")
    draw.text(((x + 18) * S, (y + 44) * S), label, font=F_HEAD_SUB, fill="#eef3f8")

    centers = {}
    for i, (tag, name, kind) in enumerate(rows):
        top = y + HEAD_H + i * ROW_H
        mid = top + ROW_H // 2
        centers[name] = mid
        if i:
            draw.line([(x + 12) * S, top * S, (x + BOX_W - 12) * S, top * S], fill="#edf0f3", width=S)
        if tag:
            tw = 34
            draw.rounded_rectangle([(x + 14) * S, (mid - 11) * S, (x + 14 + tw) * S, (mid + 11) * S],
                                   radius=5 * S, fill=TAG_COLORS[tag])
            draw.text(((x + 14 + tw / 2) * S, mid * S), tag, font=F_TAG, fill="white", anchor="mm")
        draw.text(((x + 60) * S, mid * S), name, font=F_ROW_B if tag else F_ROW, fill=INK, anchor="lm")
        draw.text(((x + BOX_W - 16) * S, mid * S), kind, font=F_ROW, fill=MUTED, anchor="rm")
    return centers


def draw_relationship(draw: ImageDraw.ImageDraw, users_y: int, pred_y: int) -> None:
    """users (1, exatamente um) ──── predictions (N, zero ou muitos), notação pé de galinha."""
    x0 = POS["users"][0] + BOX_W
    x1 = POS["predictions"][0]
    xm = (x0 + x1) // 2
    pts = [(x0, users_y), (xm, users_y), (xm, pred_y), (x1, pred_y)]
    draw.line([(px * S, py * S) for px, py in pts], fill=INK, width=3 * S, joint="curve")
    # Lado "1": duas barras = exatamente um usuário
    for dx in (16, 26):
        draw.line([(x0 + dx) * S, (users_y - 13) * S, (x0 + dx) * S, (users_y + 13) * S], fill=INK, width=3 * S)
    # Lado "N": pé de galinha + círculo = zero ou muitas análises
    for dy in (-14, 0, 14):
        draw.line([(x1 - 26) * S, pred_y * S, x1 * S, (pred_y + dy) * S], fill=INK, width=3 * S)
    cx = x1 - 40
    draw.ellipse([(cx - 8) * S, (pred_y - 8) * S, (cx + 8) * S, (pred_y + 8) * S], fill="white", outline=INK, width=3 * S)
    draw.text(((x0 + 22) * S, (users_y - 34) * S), "1", font=F_CARD, fill=INK, anchor="mm")
    draw.text(((x1 - 22) * S, (pred_y - 34) * S), "N", font=F_CARD, fill=INK, anchor="mm")
    draw.text(((xm + 12) * S, ((users_y + pred_y) / 2) * S), "faz", font=F_ROW_B, fill=INK, anchor="lm")


def main() -> None:
    image = Image.new("RGB", (W * S, H * S), "white")
    draw = ImageDraw.Draw(image)
    draw.text((70 * S, 44 * S), "DER lógico do PixoraMed", font=F_TITLE, fill=INK)
    draw.text((70 * S, 96 * S), "Banco PostgreSQL · 3 tabelas criadas pelo Hibernate a partir das entidades do backend "
              "· nenhuma tabela guarda a imagem enviada", font=F_SUB, fill=MUTED)

    centers = {key: draw_entity(draw, key) for key in ENTITIES}
    draw_relationship(draw, centers["users"]["id"], centers["predictions"]["user_id"])

    # Observações abaixo de users e predictions
    notes = [
        "Relação: 1 usuário faz 0 ou N análises; cada análise pertence a exatamente 1 usuário.",
        "user_id é chave estrangeira (fk_predictions_user), sem cascata: ao excluir a conta, o backend apaga",
        "   as análises antes do usuário, na mesma transação.",
        "Índice idx_predictions_user_id em predictions.user_id, para a busca do histórico.",
        "trainings não se liga a nenhuma tabela: cada linha é um treino importado do training-results.csv.",
        "UK em trainings: run_at + dataset juntos são únicos (o mesmo treino não entra duas vezes).",
    ]
    y = 640
    draw.text((70 * S, y * S), "Observações", font=F_HEAD, fill=INK)
    for i, text in enumerate(notes):
        draw.text((70 * S, (y + 42 + i * 30) * S), ("• " if not text.startswith("   ") else "  ") + text.strip(),
                  font=F_NOTE, fill=INK)

    # Legenda
    ly = 900
    draw.text((70 * S, ly * S), "Legenda", font=F_HEAD, fill=INK)
    for i, (tag, text) in enumerate([("PK", "chave primária"), ("FK", "chave estrangeira"),
                                     ("UK", "valor único")]):
        yy = ly + 46 + i * 34
        draw.rounded_rectangle([70 * S, (yy - 11) * S, 104 * S, (yy + 11) * S], radius=5 * S, fill=TAG_COLORS[tag])
        draw.text((87 * S, yy * S), tag, font=F_TAG, fill="white", anchor="mm")
        draw.text((116 * S, yy * S), text, font=F_NOTE, fill=INK, anchor="lm")
    yy = ly + 46 + 3 * 34 + 8
    draw.line([70 * S, yy * S, 160 * S, yy * S], fill=INK, width=3 * S)
    for dx in (78, 86):
        draw.line([dx * S, (yy - 10) * S, dx * S, (yy + 10) * S], fill=INK, width=3 * S)
    for dy in (-10, 0, 10):
        draw.line([140 * S, yy * S, 160 * S, (yy + dy) * S], fill=INK, width=3 * S)
    draw.ellipse([124 * S, (yy - 6) * S, 136 * S, (yy + 6) * S], fill="white", outline=INK, width=2 * S)
    draw.text((176 * S, yy * S), "lado das barras: exatamente 1  ·  lado do pé de galinha: zero ou muitos (0..N)", font=F_NOTE, fill=INK, anchor="lm")

    image.save(OUT)
    print(f"DER salvo em {OUT}")


if __name__ == "__main__":
    main()
