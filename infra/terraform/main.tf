# Recursos na nuvem (todos no plano gratuito):
#   Vercel: frontend (React)  --/api (rewrite)-->  Render: backend (Spring Boot)  --HTTP + token-->  Render: ai-service (ONNX)
#                                                         |
#                                                        SQL
#                                                         v
#                                                 Neon (PostgreSQL)

# Banco PostgreSQL. JÁ EXISTE e tem dados: prevent_destroy impede que o Terraform o apague ou recrie.
resource "neon_project" "database" {
  name                      = var.database_name
  region_id                 = "aws-us-east-1" # Virginia, a mesma região do Render
  history_retention_seconds = 21600           # limite do plano gratuito

  lifecycle {
    prevent_destroy = true
  }
}

# Segredos gerados aqui e guardados só no state do Terraform (nunca em arquivo versionado)
resource "random_password" "ai_service_token" {
  length  = 48
  special = false
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = false
}

# Microsserviço de IA: carrega os modelos ONNX e devolve probabilidades. Não acessa o banco.
# O endereço é público (o serviço privado do Render não é gratuito), por isso exige o token interno.
resource "render_web_service" "ai_service" {
  name              = "${var.project_name}-ai-service"
  plan              = "free"
  region            = "virginia"
  health_check_path = "/health"

  runtime_source = {
    docker = {
      repo_url        = "https://github.com/${var.github_repo}"
      branch          = var.branch
      dockerfile_path = "./ai-service/Dockerfile"
      context         = "./ai-service"
      auto_deploy     = true
    }
  }
}

# Backend: só responde a API em /api. O site fica na Vercel.
resource "render_web_service" "backend" {
  name              = var.project_name # vira o endereço: <project_name>.onrender.com
  plan              = "free"
  region            = "virginia"
  health_check_path = "/api/health"

  runtime_source = {
    docker = {
      repo_url        = "https://github.com/${var.github_repo}"
      branch          = var.branch
      dockerfile_path = "./backend/Dockerfile"
      context         = "./backend"
      auto_deploy     = true
    }
  }
}

# As variáveis ficam em grupos de variáveis, e não em env_vars dos serviços, porque o provedor do Render envia
# o modo de manutenção em toda atualização de serviço, e o Render recusa isso no plano gratuito.
resource "render_env_group" "ai_service" {
  name = "${var.project_name}-ai-service-env"
  env_vars = {
    AI_SERVICE_TOKEN = { value = random_password.ai_service_token.result }
  }
}

resource "render_env_group_link" "ai_service" {
  env_group_id = render_env_group.ai_service.id
  service_ids  = [render_web_service.ai_service.id]
}

resource "render_env_group" "backend" {
  name = "${var.project_name}-backend-env"
  env_vars = {
    DATABASE_URL         = { value = "jdbc:postgresql://${neon_project.database.database_host}/${neon_project.database.database_name}?sslmode=require" }
    DATABASE_USERNAME    = { value = neon_project.database.database_user }
    DATABASE_PASSWORD    = { value = neon_project.database.database_password }
    JWT_SECRET           = { value = random_password.jwt_secret.result }
    CORS_ALLOWED_ORIGINS = { value = local.frontend_url }
    AI_SERVICE_URL       = { value = render_web_service.ai_service.url }
    AI_SERVICE_TOKEN     = { value = random_password.ai_service_token.result }
  }
}

resource "render_env_group_link" "backend" {
  env_group_id = render_env_group.backend.id
  service_ids  = [render_web_service.backend.id]
}

# Frontend na Vercel: builda a pasta frontend/ a cada push. O vercel.json repassa /api para o backend.
resource "vercel_project" "frontend" {
  name           = var.project_name
  framework      = "vite"
  root_directory = "frontend"

  git_repository = {
    type              = "github"
    repo              = var.github_repo
    production_branch = var.branch
  }
}

locals {
  # Domínio padrão da Vercel. Se o nome já estiver em uso, a Vercel escolhe outro: confira no painel
  frontend_url = "https://${var.project_name}.vercel.app"
}

# Os recursos já criados antes desta refatoração mudaram de nome no código. Os blocos "moved"
# avisam o Terraform para renomear no state, sem destruir e recriar nada.
moved {
  from = neon_project.banco
  to   = neon_project.database
}

moved {
  from = random_password.token_ia
  to   = random_password.ai_service_token
}

moved {
  from = render_web_service.api
  to   = render_web_service.backend
}

moved {
  from = render_web_service.ia
  to   = render_web_service.ai_service
}

moved {
  from = render_env_group.ia
  to   = render_env_group.backend
}

moved {
  from = render_env_group_link.api_ia
  to   = render_env_group_link.backend
}
