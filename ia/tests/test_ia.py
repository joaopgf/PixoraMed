import os
from pathlib import Path

import cv2
import numpy as np
import pytest

RAIZ = Path(__file__).resolve().parents[2]
TOKEN = "token-de-teste"


@pytest.fixture(scope="module")
def cliente():
    # Usa os modelos reais do repositório; a configuração é lida na importação de app.main
    os.environ["MODELS_DIR"] = str(RAIZ / "models")
    os.environ["IA_TOKEN"] = TOKEN

    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as cliente:
        yield cliente


def _png(altura, largura, valor=128):
    ok, png = cv2.imencode(".png", np.full((altura, largura, 3), valor, dtype=np.uint8))
    assert ok
    return png.tobytes()


def _prever(cliente, modelo_id, conteudo, token=TOKEN):
    return cliente.post(
        "/prever",
        data={"modelo_id": modelo_id},
        files={"arquivo": ("x.png", conteudo, "image/png")},
        headers={"X-Token-IA": token},
    )


# ---------- API ----------


def test_saude_e_publica(cliente):
    resposta = cliente.get("/saude")
    assert resposta.status_code == 200
    assert resposta.json() == {"status": "ok", "modelos": 3}


@pytest.mark.parametrize("token", ["", "token-errado"])
def test_rotas_exigem_token(cliente, token):
    assert cliente.get("/modelos", headers={"X-Token-IA": token}).status_code == 401
    assert _prever(cliente, "oral_cor", _png(150, 150), token=token).status_code == 401


def test_modelos_reais(cliente):
    modelos = {m["id"]: m for m in cliente.get("/modelos", headers={"X-Token-IA": TOKEN}).json()}
    assert set(modelos) == {"pele_cor", "oral_cor", "cerebro_cinza"}
    assert modelos["pele_cor"]["limiar"] == pytest.approx(0.18)
    assert modelos["oral_cor"]["limiar"] is None
    assert modelos["cerebro_cinza"]["modo"] == "cinza"


@pytest.mark.parametrize("modelo_id", ["pele_cor", "oral_cor", "cerebro_cinza"])
def test_prever_com_modelo_real(cliente, modelo_id):
    resposta = _prever(cliente, modelo_id, _png(240, 240))
    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["modelo_id"] == modelo_id
    assert corpo["cancer"] in {"Pele", "Oral", "Cérebro"}
    assert (corpo["limiar"] is not None) == (modelo_id == "pele_cor")
    assert len(corpo["probabilidades"]) == len(corpo["classes"])
    assert sum(corpo["probabilidades"]) == pytest.approx(1.0, abs=1e-4)
    assert all(0.0 <= p <= 1.0 for p in corpo["probabilidades"])


def test_prever_modelo_inexistente(cliente):
    assert _prever(cliente, "nao_existe", _png(150, 150)).status_code == 404


@pytest.mark.parametrize("conteudo", [b"", b"isso nao e uma imagem"])
@pytest.mark.parametrize("modelo_id", ["pele_cor", "oral_cor", "cerebro_cinza"])
def test_prever_imagem_invalida(cliente, modelo_id, conteudo):
    assert _prever(cliente, modelo_id, conteudo).status_code == 422


# ---------- Pré-processamento e saída ----------


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


class SessaoFalsa:
    def __init__(self, saida):
        self.saida = saida

    def get_inputs(self):
        return [type("Entrada", (), {"name": "imagem"})]

    def run(self, _, __):
        return [np.array(self.saida, dtype=np.float32)]


@pytest.mark.parametrize(
    "saida,limiar,esperado",
    [
        ([[3.0, 0.0]], None, [0.9526, 0.0474]),  # logits passam pelo softmax
        ([0.2], 0.18, [0.8, 0.2]),  # com limiar, o ONNX já devolve a probabilidade da segunda classe
    ],
)
def test_prever_saida(saida, limiar, esperado):
    from app.inferencia import ModeloCarregado, prever

    modelo = ModeloCarregado(
        id="falso", cancer="Teste", modo="cor", tamanho=128, escala=255, classes=["a", "b"], sessao=SessaoFalsa(saida), limiar=limiar
    )
    assert np.allclose(prever(modelo, _png(150, 150)), esperado, atol=1e-4)
