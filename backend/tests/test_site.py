from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.site import registrar_site


def _cliente(tmp_path):
    site = tmp_path / "dist"
    (site / "assets").mkdir(parents=True)
    (site / "index.html").write_text("<html>pixoramed</html>", encoding="utf-8")
    (site / "assets" / "app.js").write_text("console.log(1)", encoding="utf-8")
    (tmp_path / "segredo.txt").write_text("fora do site", encoding="utf-8")

    app = FastAPI()

    @app.get("/api/saude")
    def saude():
        return {"status": "ok"}

    registrar_site(app, site)
    return TestClient(app)


def test_site_serve_arquivos_e_rotas_do_react(tmp_path):
    cliente = _cliente(tmp_path)

    assert cliente.get("/").text == "<html>pixoramed</html>"
    assert cliente.get("/assets/app.js").text == "console.log(1)"
    # Rota do React Router recebe o index.html
    historico = cliente.get("/historico")
    assert historico.status_code == 200
    assert historico.text == "<html>pixoramed</html>"
    assert historico.headers["cache-control"] == "no-cache"


def test_site_nao_esconde_a_api(tmp_path):
    cliente = _cliente(tmp_path)

    assert cliente.get("/api/saude").json() == {"status": "ok"}
    # Rota da API inexistente continua 404, sem cair no index.html
    assert cliente.get("/api/nao-existe").status_code == 404


def test_site_nao_sai_da_pasta(tmp_path):
    cliente = _cliente(tmp_path)

    resposta = cliente.get("/%2E%2E/segredo.txt")
    assert "fora do site" not in resposta.text
