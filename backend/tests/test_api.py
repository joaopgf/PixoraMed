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


@pytest.mark.parametrize("conteudo", [b"isso nao e uma imagem", b""])
@pytest.mark.parametrize("modo", ["cor", "cinza"])
def test_preprocessar_imagem_invalida(modo, conteudo):
    from app.inferencia import ImagemInvalida, preprocessar

    with pytest.raises(ImagemInvalida):
        preprocessar(conteudo, modo, 128, 255)


def _png(altura, largura):
    ok, png = cv2.imencode(".png", np.full((altura, largura, 3), 128, dtype=np.uint8))
    assert ok
    return png.tobytes()


class SessaoFalsa:
    def __init__(self, saida):
        self.saida = saida

    def get_inputs(self):
        return [type("Entrada", (), {"name": "imagem"})]

    def run(self, _, __):
        return [np.array(self.saida, dtype=np.float32)]


@pytest.mark.parametrize(
    "saida,limiar,classe,limiar_inconclusivo",
    [
        ([[3.0, 0.0]], None, "a", 0.8),  # softmax ~95%
        ([[0.2, 0.0]], None, "inconclusivo", 0.8),  # softmax ~55%
        ([0.2], 0.18, "b", None),  # limiar próprio: 20% já é a segunda classe, sem inconclusivo
        ([0.1], 0.18, "a", None),
    ],
)
def test_previsao_classe_e_inconclusivo(cliente, saida, limiar, classe, limiar_inconclusivo):
    from app.inferencia import ModeloCarregado

    registro = cliente.app.state.registro
    registro.modelos["falso"] = ModeloCarregado(
        id="falso", cancer="Teste", modo="cor", tamanho=128, escala=255, classes=["a", "b"], sessao=SessaoFalsa(saida), limiar=limiar
    )
    try:
        resposta = cliente.post("/api/previsoes", data={"modelo_id": "falso"}, files={"arquivo": ("x.png", _png(150, 150), "image/png")})
    finally:
        del registro.modelos["falso"]

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["classe_prevista"] == classe
    assert corpo["limiar_inconclusivo"] == limiar_inconclusivo
    assert corpo["limiar_baixa_certeza"] == (0.8 if limiar is not None else None)
    assert {item["classe"] for item in corpo["probabilidades"]} == {"a", "b"}


def test_preprocessar_pil_formato_e_normalizacao():
    from app.inferencia import preprocessar_pil

    entrada = preprocessar_pil(_png(300, 200), 224, [0.5, 0.5, 0.5], [0.25, 0.25, 0.25])
    assert entrada.shape == (1, 3, 224, 224)
    assert entrada.dtype == np.float32
    assert np.allclose(entrada, (128 / 255 - 0.5) / 0.25, atol=1e-5)


@pytest.mark.parametrize("conteudo", [b"isso nao e uma imagem", b"", _png(50, 300)])
def test_preprocessar_pil_recusa_imagem(conteudo):
    from app.inferencia import ImagemInvalida, preprocessar_pil

    with pytest.raises(ImagemInvalida):
        preprocessar_pil(conteudo, 224, [0.5, 0.5, 0.5], [0.25, 0.25, 0.25])


@pytest.mark.parametrize(
    "limiar,probabilidades,esperado",
    [
        (None, [0.8, 0.2], 0),
        (0.18, [0.8, 0.2], 1),  # abaixo de 50%, mas acima do limiar
        (0.18, [0.9, 0.1], 0),
    ],
)
def test_indice_previsto(limiar, probabilidades, esperado):
    from types import SimpleNamespace

    from app.inferencia import indice_previsto

    assert indice_previsto(SimpleNamespace(limiar=limiar), np.array(probabilidades)) == esperado
