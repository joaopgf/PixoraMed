from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Raiz do repositório (PixoraMed/), usada nos caminhos padrão
RAIZ = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    models_dir: Path = RAIZ / "models"

    # Token que a API principal envia no cabeçalho X-Token-IA. Sem token configurado, /modelos e /prever recusam tudo
    ia_token: str = ""

    max_upload_mb: int = 10

    # O padrão do ONNX Runtime cria uma thread por CPU visível, e elas disputam a pouca CPU do plano gratuito do Render
    onnx_threads: int = 1


settings = Settings()
