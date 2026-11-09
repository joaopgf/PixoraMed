import os
from pathlib import Path

import httpx
import pytest

RAIZ = Path(__file__).resolve().parents[2]


@pytest.fixture(scope="session")
def app(tmp_path_factory):
    # Banco temporário; a IA é substituída por uma falsa nos testes que precisam dela (fixture ia_falsa)
    pasta = tmp_path_factory.mktemp("pixoramed")
    os.environ["DATABASE_URL"] = f"sqlite:///{pasta / 'teste.db'}"
    os.environ["IA_URL"] = "http://ia-teste"
    os.environ["IA_TOKEN"] = "token-teste"
    os.environ["RESULTADOS_CSV"] = str(RAIZ / "data" / "resultados.csv")
    # Sem o site: o build local do React (frontend/dist) não interfere nos testes da API
    os.environ["FRONTEND_DIR"] = str(pasta / "sem_site")

    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app):  # roda o lifespan uma vez: tabelas e CSV
        yield app


def novo_cliente(app):
    from fastapi.testclient import TestClient

    return TestClient(app)


def cadastrar(cliente, email, senha="senha-segura-1", nome="Pessoa Teste"):
    return cliente.post("/api/auth/cadastro", json={"nome": nome, "email": email, "senha": senha})


@pytest.fixture(scope="session")
def cliente(app):
    """Cliente já logado, para os testes que não tratam de autenticação."""
    cliente = novo_cliente(app)
    resposta = cadastrar(cliente, "medico@teste.com")
    assert resposta.status_code == 201
    cliente.headers["Authorization"] = f"Bearer {resposta.json()['token']}"
    return cliente


class IAFalsa:
    """Responde no lugar do microsserviço de IA. Cada teste define as respostas por caminho em `respostas`."""

    def __init__(self):
        self.respostas: dict[str, httpx.Response | Exception] = {}
        self.pedidos: list[httpx.Request] = []

    def __call__(self, pedido: httpx.Request) -> httpx.Response:
        self.pedidos.append(pedido)
        resposta = self.respostas.get(pedido.url.path)
        if isinstance(resposta, Exception):
            raise resposta
        return resposta or httpx.Response(500)


@pytest.fixture
def ia_falsa(app):
    from app.cliente_ia import ClienteIA

    falsa = IAFalsa()
    original = app.state.ia
    app.state.ia = ClienteIA("http://ia-teste", "token-teste", 5, transport=httpx.MockTransport(falsa))
    yield falsa
    app.state.ia = original
