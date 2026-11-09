import httpx
import pytest

MODELOS_IA = [
    {"id": "oral_cor", "cancer": "Oral", "modo": "cor", "tamanho": 128, "normalizado": True, "classes": ["normal", "scc"],
     "descricao": "", "metricas": {}, "limiar": None},
    {"id": "pele_cor", "cancer": "Pele", "modo": "cor", "tamanho": 224, "normalizado": True, "classes": ["benigno", "maligno"],
     "descricao": "", "metricas": {}, "limiar": 0.18},
]


def _saida_ia(probabilidades, limiar=None, classes=("a", "b")):
    return httpx.Response(200, json={
        "modelo_id": "falso", "cancer": "Teste", "classes": list(classes),
        "probabilidades": probabilidades, "tempo_ms": 12.5, "limiar": limiar,
    })


def _enviar(cliente, modelo_id="falso", conteudo=b"imagem"):
    return cliente.post("/api/previsoes", data={"modelo_id": modelo_id}, files={"arquivo": ("x.png", conteudo, "image/png")})


def test_saude_nao_depende_da_ia(cliente, ia_falsa):
    resposta = cliente.get("/api/saude")
    assert resposta.status_code == 200
    assert resposta.json()["status"] == "ok"
    assert ia_falsa.pedidos == []


def test_treinos_importados_do_csv(cliente):
    treinos = cliente.get("/api/treinos").json()
    assert len(treinos) > 0
    assert {treino["modo"] for treino in treinos} <= {"cor", "cinza"}

    mama = cliente.get("/api/treinos", params={"cancer": "Mama", "modo": "cor"}).json()
    assert all(treino["cancer"] == "Mama" and treino["modo"] == "cor" for treino in mama)


def test_separar_dataset():
    from app.importacao import separar_dataset

    assert separar_dataset("Mama cor") == ("Mama", "cor", "")
    assert separar_dataset("Colo do útero cinza") == ("Colo do útero", "cinza", "")
    assert separar_dataset("Pele cor grupos pesos limit1000") == ("Pele", "cor", "grupos pesos limit1000")


# ---------- Modelos (vêm da IA) ----------


def test_modelos_vem_da_ia_com_os_limiares_de_decisao(cliente, ia_falsa):
    ia_falsa.respostas["/modelos"] = httpx.Response(200, json=MODELOS_IA)
    modelos = {m["id"]: m for m in cliente.get("/api/modelos").json()}

    assert modelos["oral_cor"]["limiar_inconclusivo"] == 0.8
    assert modelos["oral_cor"]["limiar_baixa_certeza"] is None
    assert modelos["pele_cor"]["limiar"] == 0.18
    assert modelos["pele_cor"]["limiar_inconclusivo"] is None
    assert modelos["pele_cor"]["limiar_baixa_certeza"] == 0.8
    # O token vai em todo pedido à IA
    assert ia_falsa.pedidos[0].headers["X-Token-IA"] == "token-teste"


def test_modelos_com_ia_fora_do_ar(cliente, ia_falsa):
    ia_falsa.respostas["/modelos"] = httpx.ConnectError("fora do ar")
    resposta = cliente.get("/api/modelos")
    assert resposta.status_code == 503
    assert "indisponível" in resposta.json()["detail"]


# ---------- Previsões ----------


@pytest.mark.parametrize(
    "probabilidades,limiar,classe,limiar_inconclusivo",
    [
        ([0.95, 0.05], None, "a", 0.8),
        ([0.55, 0.45], None, "inconclusivo", 0.8),
        ([0.8, 0.2], 0.18, "b", None),  # limiar próprio: 20% já é a segunda classe, sem inconclusivo
        ([0.9, 0.1], 0.18, "a", None),
    ],
)
def test_previsao_classe_e_inconclusivo(cliente, ia_falsa, probabilidades, limiar, classe, limiar_inconclusivo):
    ia_falsa.respostas["/prever"] = _saida_ia(probabilidades, limiar)
    resposta = _enviar(cliente)

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["classe_prevista"] == classe
    assert corpo["limiar_inconclusivo"] == limiar_inconclusivo
    assert corpo["limiar_baixa_certeza"] == (0.8 if limiar is not None else None)
    assert corpo["tempo_ms"] == 12.5
    assert [item["probabilidade"] for item in corpo["probabilidades"]] == sorted(probabilidades, reverse=True)

    # A API repassa a imagem e o modelo à IA, com o token
    pedido = ia_falsa.pedidos[-1]
    assert pedido.headers["X-Token-IA"] == "token-teste"
    assert b"imagem" in pedido.content and b"falso" in pedido.content


def test_previsao_vai_para_o_historico(cliente, ia_falsa):
    ia_falsa.respostas["/prever"] = _saida_ia([0.95, 0.05])
    novo = _enviar(cliente).json()
    historico = cliente.get("/api/previsoes", params={"limite": 100}).json()
    assert any(item["id"] == novo["id"] and item["classe_prevista"] == "a" for item in historico)


@pytest.mark.parametrize("status,detalhe", [(404, "Modelo 'x' não encontrado."), (422, "Não foi possível ler a imagem.")])
def test_previsao_repassa_recusa_da_ia(cliente, ia_falsa, status, detalhe):
    ia_falsa.respostas["/prever"] = httpx.Response(status, json={"detail": detalhe})
    resposta = _enviar(cliente)
    assert resposta.status_code == status
    assert resposta.json()["detail"] == detalhe


@pytest.mark.parametrize(
    "falha",
    [httpx.ConnectError("fora do ar"), httpx.ReadTimeout("demorou"), httpx.Response(500), httpx.Response(401, json={"detail": "token"})],
)
def test_previsao_com_ia_indisponivel(cliente, ia_falsa, falha):
    ia_falsa.respostas["/prever"] = falha
    resposta = _enviar(cliente)
    assert resposta.status_code == 503
    assert "indisponível" in resposta.json()["detail"]


def test_previsao_grande_demais_nem_chega_na_ia(cliente, ia_falsa):
    from app.config import settings

    resposta = _enviar(cliente, conteudo=b"0" * (settings.max_upload_mb * 1024 * 1024 + 1))
    assert resposta.status_code == 413
    assert ia_falsa.pedidos == []


# ---------- Regra de decisão ----------


@pytest.mark.parametrize(
    "limiar,probabilidades,esperado",
    [
        (None, [0.8, 0.2], 0),
        (None, [0.1, 0.3, 0.6], 2),
        (0.18, [0.8, 0.2], 1),  # abaixo de 50%, mas acima do limiar
        (0.18, [0.9, 0.1], 0),
    ],
)
def test_indice_previsto(limiar, probabilidades, esperado):
    from app.decisao import indice_previsto

    assert indice_previsto(probabilidades, limiar) == esperado
