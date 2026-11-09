from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse


def registrar_site(app: FastAPI, pasta: Path) -> None:
    """Serve o build do React. Rotas do React Router (/historico, /resultado/3...) recebem o index.html."""
    raiz = pasta.resolve()
    index = raiz / "index.html"

    # Registre por último: as rotas de /api e /docs vêm antes desta
    @app.get("/{caminho:path}", include_in_schema=False)
    def site(caminho: str):
        if caminho == "api" or caminho.startswith("api/"):
            raise HTTPException(status_code=404, detail="Rota da API não encontrada.")
        arquivo = (raiz / caminho).resolve()
        if caminho and arquivo.is_file() and arquivo.is_relative_to(raiz):
            return FileResponse(arquivo)
        # O index.html não vai para o cache, para o navegador pegar a versão nova a cada deploy
        return FileResponse(index, headers={"Cache-Control": "no-cache"})
