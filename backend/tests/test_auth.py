from datetime import timedelta

import pytest
from sqlalchemy import select, update

from conftest import cadastrar, novo_cliente


def _entrar(cliente, email, senha="senha-segura-1"):
    return cliente.post("/api/auth/login", json={"email": email, "senha": senha})


def _com_token(app, token):
    cliente = novo_cliente(app)
    cliente.headers["Authorization"] = f"Bearer {token}"
    return cliente


def test_cadastro_devolve_sessao_e_nao_expoe_a_senha(app):
    resposta = cadastrar(novo_cliente(app), "  Ana@Teste.com ", nome="  Ana   Souza ")
    assert resposta.status_code == 201
    corpo = resposta.json()
    assert corpo["token"]
    assert corpo["usuario"]["email"] == "ana@teste.com"
    assert corpo["usuario"]["nome"] == "Ana Souza"
    assert "senha" not in str(corpo).lower()


def test_senha_guardada_so_como_hash(app):
    from app.db import SessionLocal
    from app.tabelas import Usuario

    cadastrar(novo_cliente(app), "hash@teste.com", senha="minha-senha-123")
    with SessionLocal() as db:
        guardado = db.scalar(select(Usuario.senha_hash).where(Usuario.email == "hash@teste.com"))
    assert guardado.startswith("scrypt$")
    assert "minha-senha-123" not in guardado


def test_cadastro_com_email_repetido(app):
    cliente = novo_cliente(app)
    assert cadastrar(cliente, "repetido@teste.com").status_code == 201
    resposta = cadastrar(cliente, "REPETIDO@teste.com")
    assert resposta.status_code == 409


@pytest.mark.parametrize(
    "dados",
    [
        {"nome": "Bia", "email": "sem-arroba", "senha": "senha-segura-1"},
        {"nome": "Bia", "email": "bia@teste.com", "senha": "curta"},
        {"nome": " ", "email": "bia@teste.com", "senha": "senha-segura-1"},
    ],
)
def test_cadastro_recusa_dados_invalidos(app, dados):
    assert novo_cliente(app).post("/api/auth/cadastro", json=dados).status_code == 422


def test_login_certo_e_errado(app):
    cliente = novo_cliente(app)
    cadastrar(cliente, "login@teste.com")

    certo = _entrar(cliente, "LOGIN@teste.com")
    assert certo.status_code == 200
    assert certo.json()["usuario"]["email"] == "login@teste.com"

    senha_errada = _entrar(cliente, "login@teste.com", "senha-errada-1")
    sem_conta = _entrar(cliente, "ninguem@teste.com")
    assert senha_errada.status_code == sem_conta.status_code == 401
    # A mesma mensagem nos dois casos: não revela quais e-mails têm conta
    assert senha_errada.json()["detail"] == sem_conta.json()["detail"]


def test_rotas_protegidas_exigem_login(app):
    cliente = novo_cliente(app)
    assert cliente.get("/api/previsoes").status_code == 401
    assert cliente.post("/api/previsoes", data={"modelo_id": "x"}).status_code == 401
    assert cliente.get("/api/auth/eu").status_code == 401
    assert _com_token(app, "token-inventado").get("/api/auth/eu").status_code == 401
    # Os resultados dos treinos continuam públicos
    assert cliente.get("/api/treinos").status_code == 200


def test_eu_e_sair(app):
    token = cadastrar(novo_cliente(app), "sair@teste.com").json()["token"]
    cliente = _com_token(app, token)
    assert cliente.get("/api/auth/eu").json()["email"] == "sair@teste.com"

    assert cliente.post("/api/auth/sair").status_code == 204
    # Depois de sair, o mesmo token não vale mais
    assert cliente.get("/api/auth/eu").status_code == 401


def test_sessao_expirada(app):
    from app.db import SessionLocal
    from app.tabelas import Sessao, Usuario, agora

    token = cadastrar(novo_cliente(app), "expira@teste.com").json()["token"]
    with SessionLocal() as db:
        usuario_id = db.scalar(select(Usuario.id).where(Usuario.email == "expira@teste.com"))
        db.execute(update(Sessao).where(Sessao.usuario_id == usuario_id).values(expira_em=agora() - timedelta(minutes=1)))
        db.commit()
    assert _com_token(app, token).get("/api/auth/eu").status_code == 401


def test_historico_separado_por_usuario(app, cliente):
    """Cada usuário vê só as próprias análises."""
    from app.db import SessionLocal
    from app.tabelas import Previsao, Usuario

    with SessionLocal() as db:
        medico = db.scalar(select(Usuario).where(Usuario.email == "medico@teste.com"))
        db.add(Previsao(usuario_id=medico.id, modelo_id="oral_cor", classe_prevista="normal", confianca=0.9, tempo_ms=1))
        db.add(Previsao(usuario_id=None, modelo_id="oral_cor", classe_prevista="normal", confianca=0.9, tempo_ms=1))
        db.commit()

        ids_do_medico = set(db.scalars(select(Previsao.id).where(Previsao.usuario_id == medico.id)))

    proprios = {item["id"] for item in cliente.get("/api/previsoes").json()}
    # Vê todas as próprias e nenhuma sem dono
    assert proprios == ids_do_medico

    outro = _com_token(app, cadastrar(novo_cliente(app), "outro@teste.com").json()["token"])
    assert outro.get("/api/previsoes").json() == []


def test_conferir_senha():
    from app.autenticacao import conferir_senha, gerar_hash_senha

    guardado = gerar_hash_senha("abc12345")
    assert conferir_senha("abc12345", guardado)
    assert not conferir_senha("abc12346", guardado)
    assert not conferir_senha("abc12345", "formato-invalido")


def test_migracao_acrescenta_dono_nas_previsoes_antigas(tmp_path):
    """Banco criado antes do login (como o do Neon): a tabela previsoes existe sem usuario_id."""
    from sqlalchemy import create_engine, inspect, text

    from app.db import Base, atualizar_esquema

    engine = create_engine(f"sqlite:///{tmp_path / 'antigo.db'}")
    with engine.begin() as conexao:
        conexao.execute(text(
            "CREATE TABLE previsoes (id INTEGER PRIMARY KEY, criado_em DATETIME, modelo_id VARCHAR(60), "
            "classe_prevista VARCHAR(60), confianca FLOAT, tempo_ms FLOAT)"
        ))
        conexao.execute(text("INSERT INTO previsoes VALUES (1, '2026-11-09', 'oral_cor', 'normal', 0.9, 1)"))

    Base.metadata.create_all(engine)  # cria usuarios e sessoes, mas não mexe em previsoes
    atualizar_esquema(engine)
    atualizar_esquema(engine)  # rodar de novo não pode quebrar

    assert "usuario_id" in {coluna["name"] for coluna in inspect(engine).get_columns("previsoes")}
    with engine.connect() as conexao:
        assert conexao.execute(text("SELECT usuario_id FROM previsoes")).scalar() is None
