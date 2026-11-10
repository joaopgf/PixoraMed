"""Testes do ai-service: token interno, modelos reais da pasta models/, pré-processamento e saída."""

import os
from pathlib import Path

import cv2
import numpy as np
import pytest

SERVICE_DIR = Path(__file__).resolve().parents[1]
TOKEN = "test-token"

# A configuração é lida na importação de app.config, então as variáveis vêm antes
os.environ["MODELS_DIR"] = str(SERVICE_DIR / "models")
os.environ["AI_SERVICE_TOKEN"] = TOKEN


@pytest.fixture(scope="module")
def client():
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as test_client:
        yield test_client


def make_png(height, width, value=128):
    ok, png = cv2.imencode(".png", np.full((height, width, 3), value, dtype=np.uint8))
    assert ok
    return png.tobytes()


def post_predict(client, model_id, content, token=TOKEN):
    return client.post(
        "/predict",
        data={"model_id": model_id},
        files={"file": ("x.png", content, "image/png")},
        headers={"X-Internal-Token": token},
    )


# ---------- API ----------


def test_health_is_public(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "models": 3}


@pytest.mark.parametrize("token", ["", "wrong-token"])
def test_routes_require_token(client, token):
    assert client.get("/models", headers={"X-Internal-Token": token}).status_code == 401
    assert post_predict(client, "oral_color", make_png(150, 150), token=token).status_code == 401


def test_real_models(client):
    models = {m["id"]: m for m in client.get("/models", headers={"X-Internal-Token": TOKEN}).json()}
    assert set(models) == {"skin_color", "oral_color", "brain_gray"}
    assert models["skin_color"]["threshold"] == pytest.approx(0.18)
    assert models["oral_color"]["threshold"] is None
    assert models["brain_gray"]["mode"] == "gray"


@pytest.mark.parametrize("model_id", ["skin_color", "oral_color", "brain_gray"])
def test_predict_with_real_model(client, model_id):
    response = post_predict(client, model_id, make_png(240, 240))
    assert response.status_code == 200
    body = response.json()
    assert body["model_id"] == model_id
    assert body["cancer_type"] in {"skin", "oral", "brain"}
    assert (body["threshold"] is not None) == (model_id == "skin_color")
    assert len(body["probabilities"]) == len(body["classes"])
    assert sum(body["probabilities"]) == pytest.approx(1.0, abs=1e-4)


def test_predict_unknown_model(client):
    assert post_predict(client, "does_not_exist", make_png(150, 150)).status_code == 404


@pytest.mark.parametrize("content", [b"", b"not an image"])
@pytest.mark.parametrize("model_id", ["skin_color", "oral_color", "brain_gray"])
def test_predict_invalid_image(client, model_id, content):
    assert post_predict(client, model_id, content).status_code == 422


# ---------- Pré-processamento e saída ----------


@pytest.mark.parametrize("mode,channels", [("color", 3), ("gray", 1)])
def test_preprocess_shape(mode, channels):
    from app.inference import preprocess

    image = np.random.default_rng(0).integers(0, 256, (300, 200, 3), dtype=np.uint8)
    ok, png = cv2.imencode(".png", image)
    assert ok

    model_input = preprocess(png.tobytes(), mode, 128, 255)
    assert model_input.shape == (1, channels, 128, 128)
    assert model_input.dtype == np.float32
    assert 0.0 <= model_input.min() and model_input.max() <= 1.0


def test_preprocess_pil_shape_and_normalization():
    from app.inference import preprocess_pil

    model_input = preprocess_pil(make_png(300, 200), 224, [0.5, 0.5, 0.5], [0.25, 0.25, 0.25])
    assert model_input.shape == (1, 3, 224, 224)
    assert np.allclose(model_input, (128 / 255 - 0.5) / 0.25, atol=1e-5)


def test_preprocess_pil_rejects_small_image():
    from app.inference import InvalidImage, preprocess_pil

    with pytest.raises(InvalidImage):
        preprocess_pil(make_png(50, 300), 224, [0.5, 0.5, 0.5], [0.25, 0.25, 0.25])


class FakeSession:
    def __init__(self, output):
        self.output = output

    def get_inputs(self):
        return [type("Input", (), {"name": "image"})]

    def run(self, _, __):
        return [np.array(self.output, dtype=np.float32)]


@pytest.mark.parametrize(
    "output,threshold,expected",
    [
        ([[3.0, 0.0]], None, [0.9526, 0.0474]),  # logits passam pelo softmax
        ([0.2], 0.18, [0.8, 0.2]),  # com limiar, o ONNX já devolve a probabilidade da segunda classe
    ],
)
def test_predict_output(output, threshold, expected):
    from app.inference import LoadedModel, predict

    model = LoadedModel(
        id="fake", cancer_type="test", mode="color", size=128, scale=255, classes=["a", "b"],
        session=FakeSession(output), threshold=threshold,
    )
    assert np.allclose(predict(model, make_png(150, 150)), expected, atol=1e-4)
