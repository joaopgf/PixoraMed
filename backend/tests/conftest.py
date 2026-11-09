import os
from pathlib import Path

import pytest

RAIZ = Path(__file__).resolve().parents[2]


@pytest.fixture(scope="session")
def app(tmp_path_factory):
    # Banco temporário e pasta de modelos vazia: os testes não dependem do que está em models/
    pasta = tmp_path_factory.mktemp("pixoramed")
    os.environ["DATABASE_URL"] = f"sqlite:///{pasta / 'teste.db'}"
    os.environ["MODELS_DIR"] = str(pasta / "models")
    os.environ["RESULTADOS_CSV"] = str(RAIZ / "data" / "resultados.csv")
    # Sem o site: o build local do React (frontend/dist) não interfere nos testes da API
    os.environ["FRONTEND_DIR"] = str(pasta / "sem_site")

    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app):  # roda o lifespan uma vez: tabelas, CSV e modelos
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
