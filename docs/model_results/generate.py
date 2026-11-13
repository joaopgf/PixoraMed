# Gera os gráficos de comparação dos treinos (cor x cinza e divisão por 255) a partir do CSV do backend.
# Refaz os dois gráficos de barras da antiga página "Resultados dos treinos" do site, só com Oral e Cérebro.
# Uso: python docs/model_results/generate.py
import csv
from collections import defaultdict
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parents[2]
CSV_PATH = ROOT / "backend" / "src" / "main" / "resources" / "data" / "training-results.csv"
OUT = Path(__file__).resolve().parent / "comparisons"

# Só os módulos que o sistema usa e que têm experimentos de CNN no CSV (a Pele usa outro modelo)
MODULES = {"Oral": "Oral", "Cérebro": "Cérebro"}
COLORS = {"color": "#238bb2", "gray": "#a9bfcc", "div255": "#17698f", "raw": "#e2a94d"}
MODE_NAME = {"color": "cor", "gray": "cinza"}


def number(text):
    return float(text.replace(",", "."))


def load_runs():
    """Agrupa as execuções por (módulo, modo, divisão por 255) e tira a média das repetidas, como o site fazia."""
    groups = defaultdict(list)
    with open(CSV_PATH, encoding="utf-8-sig", newline="") as file:
        for row in csv.DictReader(file, delimiter=";"):
            parts = row["dataset"].split()
            if len(parts) != 2 or parts[0] not in MODULES:
                continue  # fora do escopo ou execução com variante
            mode = "color" if row["modo"].upper() == "RGB" else "gray"
            div255 = row["normalizado"].strip().lower() == "sim"
            groups[(parts[0], mode, div255)].append(
                (number(row["acc_media_%"]), number(row["acc_desvio_%"]))
            )
    return {
        key: (sum(a for a, _ in runs) / len(runs), sum(s for _, s in runs) / len(runs), len(runs))
        for key, runs in groups.items()
    }


def bar_chart(path, title, labels, series, note):
    """series: [(nome, cor, [(média, desvio) ou None por rótulo])]."""
    fig, ax = plt.subplots(figsize=(9, 5.2), dpi=150)
    width = 0.8 / len(series)
    for i, (name, color, values) in enumerate(series):
        for j, value in enumerate(values):
            x = j + (i - (len(series) - 1) / 2) * width
            if value is None:
                ax.text(x, 52, "não\nrodado", ha="center", va="bottom", fontsize=9, color="#6f8798")
                continue
            mean, std = value
            ax.bar(x, mean, width * 0.92, color=color, label=name)
            ax.errorbar(x, mean, yerr=std, color="#1f2d3a", capsize=5, linewidth=1.2)
            ax.text(x, mean + std + 0.8, f"{mean:.2f}".replace(".", ","), ha="center", fontsize=10, fontweight="bold")
    ax.set_xticks(range(len(labels)), labels, fontsize=11)
    ax.set_ylim(50, 102)
    ax.set_ylabel("Acurácia no teste (%)")
    ax.set_title(title, fontsize=13, pad=30)
    ax.grid(axis="y", linestyle="--", alpha=0.4)
    ax.set_axisbelow(True)
    ax.spines[["top", "right"]].set_visible(False)
    handles, names = ax.get_legend_handles_labels()
    unique = dict(zip(names, handles))
    ax.legend(unique.values(), unique.keys(), loc="lower center", bbox_to_anchor=(0.5, 1.0), ncol=2, frameon=False)
    fig.text(0.01, 0.01, note, fontsize=8.5, color="#6f8798", wrap=True)
    fig.tight_layout(rect=(0, 0.07, 1, 1))
    fig.savefig(path)
    plt.close(fig)
    print("salvo:", path.relative_to(ROOT))


def main():
    runs = load_runs()
    OUT.mkdir(parents=True, exist_ok=True)
    note = "Média ± desvio padrão em 5 folds, 1.000 imagens por classe. Fonte: training-results.csv."

    def value(module, mode, div255):
        found = runs.get((module, mode, div255))
        return found[:2] if found else None

    for div255, suffix, label in ((True, "div255", "com divisão por 255"), (False, "raw", "sem divisão por 255")):
        bar_chart(
            OUT / f"color_vs_gray_{suffix}.png",
            f"Cor x tons de cinza ({label})",
            list(MODULES.values()),
            [
                ("Colorido (RGB)", COLORS["color"], [value(m, "color", div255) for m in MODULES]),
                ("Tons de cinza", COLORS["gray"], [value(m, "gray", div255) for m in MODULES]),
            ],
            note,
        )

    labels = [(m, mode) for m in MODULES for mode in ("color", "gray")]
    bar_chart(
        OUT / "div255_effect.png",
        "Efeito da divisão por 255",
        [f"{MODULES[m]} {MODE_NAME[mode]}" for m, mode in labels],
        [
            ("Com divisão por 255", COLORS["div255"], [value(m, mode, True) for m, mode in labels]),
            ("Sem divisão (0 a 255)", COLORS["raw"], [value(m, mode, False) for m, mode in labels]),
        ],
        note + "\nOral cinza com divisão rodou duas vezes: a barra é a média das duas.",
    )


if __name__ == "__main__":
    main()
