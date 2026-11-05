from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Raiz do repositório (PixoraMed/), usada nos caminhos padrão
RAIZ = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Sem DATABASE_URL usa SQLite local; no Docker e na nuvem aponta para o Postgres
    database_url: str = f"sqlite:///{RAIZ / 'data' / 'pixoramed.db'}"
    models_dir: Path = RAIZ / "models"
    resultados_csv: Path = RAIZ / "data" / "resultados.csv"

    # Importa o resultados.csv ao iniciar a API (só acrescenta linhas novas)
    importar_csv_no_inicio: bool = True

    # Origens do frontend, separadas por vírgula
    cors_origins: str = "http://localhost:5173,http://localhost:8080"

    max_upload_mb: int = 10

    # Abaixo desta confiança, o resultado é "inconclusivo" (não vale para modelos com limiar próprio, como o da Pele)
    limiar_inconclusivo: float = 0.8

    @property
    def lista_cors(self) -> list[str]:
        return [origem.strip() for origem in self.cors_origins.split(",") if origem.strip()]


settings = Settings()
