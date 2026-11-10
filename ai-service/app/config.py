"""Configuração do ai-service, lida das variáveis de ambiente (ou do arquivo ai-service/.env)."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

SERVICE_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Obrigatória: token que o backend envia no header X-Internal-Token. Sem ela, o serviço não sobe
    ai_service_token: str

    models_dir: Path = SERVICE_DIR / "models"
    max_upload_mb: int = 10
    # O padrão do ONNX Runtime cria uma thread por CPU visível, e elas disputam a pouca CPU do plano gratuito do Render
    onnx_threads: int = 1


settings = Settings()
