import os
from pathlib import Path

import cv2
import numpy as np
import pytest

RAIZ = Path(__file__).resolve().parents[2]


@pytest.fixture(scope="module")
def cliente(tmp_path_factory):
    # Banco temporário e pasta de modelos vazia: o teste não depende do que está em models/
    pasta = tmp_path_factory.mktemp("pixoramed")
    os.environ["DATABASE_URL"] = f"sqlite:///{pasta / 'teste.db'}"
    os.environ["MODELS_DIR"] = str(pasta / "models")
    os.environ["RESULTADOS_CSV"] = str(RAIZ / "data" / "resultados.csv")

    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as cliente:
        yield cliente


def test_saude(cliente):
    resposta = cliente.get("/api/saude")
    assert resposta.status_code == 200
    assert resposta.json()["status"] == "ok"


def test_treinos_importados_do_csv(cliente):
    treinos = cliente.get("/api/treinos").json()
    assert len(treinos) > 0
    assert {treino["modo"] for treino in treinos} <= {"cor", "cinza"}

    mama = cliente.get("/api/treinos", params={"cancer": "Mama", "modo": "cor"}).json()
    assert all(treino["cancer"] == "Mama" and treino["modo"] == "cor" for treino in mama)


def test_previsao_modelo_inexistente(cliente):
    resposta = cliente.post(
        "/api/previsoes",
        data={"modelo_id": "nao_existe"},
        files={"arquivo": ("x.png", b"123", "image/png")},
    )
    assert resposta.status_code == 404


def test_separar_dataset():
    from app.importacao import separar_dataset

    assert separar_dataset("Mama cor") == ("Mama", "cor", "")
    assert separar_dataset("Colo do útero cinza") == ("Colo do útero", "cinza", "")
    assert separar_dataset("Pele cor grupos pesos limit1000") == ("Pele", "cor", "grupos pesos limit1000")


@pytest.mark.parametrize("modo,canais", [("cor", 3), ("cinza", 1)])
def test_preprocessar_formato(modo, canais):
    from app.inferencia import preprocessar

    imagem = np.random.default_rng(0).integers(0, 256, (300, 200, 3), dtype=np.uint8)
    ok, png = cv2.imencode(".png", imagem)
    assert ok

    entrada = preprocessar(png.tobytes(), modo, 128, 255)
    assert entrada.shape == (1, canais, 128, 128)
    assert entrada.dtype == np.float32
    assert 0.0 <= entrada.min() and entrada.max() <= 1.0


def test_preprocessar_imagem_invalida():
    from app.inferencia import ImagemInvalida, preprocessar

    with pytest.raises(ImagemInvalida):
        preprocessar(b"isso nao e uma imagem", "cor", 128, 255)
