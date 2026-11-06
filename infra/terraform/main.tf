# Arquitetura na nuvem (tudo no plano gratuito):
#   Vercel (React)  --HTTPS-->  Render (FastAPI + ONNX, Docker)  --SQL-->  Neon (PostgreSQL)

# Banco PostgreSQL. Mesma região da API (Oregon) para as consultas serem rápidas.
resource "neon_project" "banco" {
  name                      = var.nome
  region_id                 = "aws-us-west-2"
  history_retention_seconds = 21600 # limite do plano gratuito
}

# API: o Render faz o build do backend/Dockerfile a cada push na branch
resource "render_web_service" "api" {
  name              = "${var.nome}-api"
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
    CORS_ORIGINS = { value = "https://${var.nome}.vercel.app" }
  }
}

# Frontend: a Vercel faz o build da pasta frontend/ a cada push
resource "vercel_project" "web" {
  name           = var.nome
  framework      = "vite"
  root_directory = "frontend"

  git_repository = {
    type              = "github"
    repo              = var.github_repo
    production_branch = var.branch
  }
}

resource "vercel_project_environment_variable" "api_url" {
  project_id = vercel_project.web.id
  key        = "VITE_API_URL"
  value      = render_web_service.api.url
  target     = ["production", "preview"]
  sensitive  = false # é a URL pública da API
}
