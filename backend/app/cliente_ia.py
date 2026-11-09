"""Cliente HTTP do microsserviço de IA (pasta ia/ do repositório)."""

import logging
import time

import httpx

log = logging.getLogger(__name__)

INDISPONIVEL = "O serviço de IA está indisponível no momento. Tente de novo em instantes."

# A lista de modelos quase nunca muda: guarda por 5 minutos para não chamar a IA a cada tela
VALIDADE_CACHE_MODELOS = 300


class ServicoIAIndisponivel(Exception):
    """A IA não respondeu, demorou demais ou recusou o token."""


class RecusaDaIA(Exception):
    """A IA respondeu com um erro do pedido (modelo inexistente, imagem inválida ou grande demais)."""

    def __init__(self, status: int, detalhe: str):
        super().__init__(detalhe)
        self.status = status
        self.detalhe = detalhe


class ClienteIA:
    def __init__(self, url: str, token: str, timeout: float, transport: httpx.AsyncBaseTransport | None = None):
        self._http = httpx.AsyncClient(base_url=url, headers={"X-Token-IA": token}, timeout=timeout, transport=transport)
        self._modelos: list[dict] | None = None
        self._modelos_em = 0.0

    async def fechar(self) -> None:
        await self._http.aclose()

    async def _pedir(self, metodo: str, caminho: str, **kwargs) -> dict | list:
        try:
            resposta = await self._http.request(metodo, caminho, **kwargs)
        except httpx.HTTPError as erro:
            log.warning("IA sem resposta em %s: %s", caminho, erro)
            raise ServicoIAIndisponivel from erro
        if resposta.status_code in (404, 413, 422):
            raise RecusaDaIA(resposta.status_code, resposta.json().get("detail", "Pedido recusado pelo serviço de IA."))
        if resposta.status_code == 401:
            log.error("A IA recusou o token: confira IA_TOKEN nos dois serviços")
            raise ServicoIAIndisponivel
        if resposta.status_code != 200:
            log.warning("IA respondeu %s em %s", resposta.status_code, caminho)
            raise ServicoIAIndisponivel
        return resposta.json()

    async def listar_modelos(self) -> list[dict]:
        if self._modelos is None or time.monotonic() - self._modelos_em > VALIDADE_CACHE_MODELOS:
            self._modelos = await self._pedir("GET", "/modelos")
            self._modelos_em = time.monotonic()
        return self._modelos

    async def prever(self, modelo_id: str, nome_arquivo: str, conteudo: bytes, tipo: str) -> dict:
        return await self._pedir(
            "POST",
            "/prever",
            data={"modelo_id": modelo_id},
            files={"arquivo": (nome_arquivo or "imagem", conteudo, tipo or "application/octet-stream")},
        )
