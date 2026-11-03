"""Importa um resultados.csv dos notebooks para o banco (só acrescenta execuções novas).

Uso (de dentro de backend/):
    python scripts/importar_resultados.py                      # usa data/resultados.csv
    python scripts/importar_resultados.py caminho/resultados.csv

O banco é o da variável DATABASE_URL (ou o SQLite local, se ela não existir).
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import settings  # noqa: E402
from app.db import Base, SessionLocal, engine  # noqa: E402
from app.importacao import importar_resultados  # noqa: E402


def main() -> None:
    caminho = Path(sys.argv[1]) if len(sys.argv) > 1 else settings.resultados_csv
    if not caminho.exists():
        sys.exit(f"Arquivo não encontrado: {caminho}")

    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        inseridos = importar_resultados(db, caminho)
    print(f"{inseridos} treinos novos importados de {caminho}")


if __name__ == "__main__":
    main()
