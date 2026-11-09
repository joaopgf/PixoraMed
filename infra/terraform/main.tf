# Arquitetura na nuvem (tudo no plano gratuito):
#   Render (um container: site React + FastAPI + ONNX)  --SQL-->  Neon (PostgreSQL)

# Banco PostgreSQL. Mesma região da API (Oregon) para as consultas serem rápidas.
resource "neon_project" "banco" {
  name                      = var.nome
  region_id                 = "aws-us-west-2"
  history_retention_seconds = 21600 # limite do plano gratuito
}

# Site e API: o Render faz o build do backend/Dockerfile a cada push na branch.
# O mesmo container serve o React e a API, então não há CORS a configurar.
resource "render_web_service" "api" {
  name              = var.nome # vira o endereço: <nome>.onrender.com
  plan              = "free"
  region            = "oregon"
  health_check_path = "/api/saude"

  runtime_source = {
    docker = {
      repo_url        = "https://github.com/${var.github_repo}"
      branch          = var.branch
      dockerfile_path = "./backend/Dockerfile"
      context         = "."
      auto_deploy     = true
    }
  }

  env_vars = {
    DATABASE_URL = { value = neon_project.banco.connection_uri }
  }
}
