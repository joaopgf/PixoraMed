# Arquitetura na nuvem (tudo no plano gratuito):
#   Render: API principal (site React + FastAPI)  --HTTP + token-->  Render: microsserviço de IA (ONNX)
#                    |
#                   SQL
#                    v
#             Neon (PostgreSQL)

# Banco PostgreSQL. Mesma região da API (Virginia, a mais próxima do Brasil no Render) para as consultas serem rápidas.
resource "neon_project" "banco" {
  name                      = var.nome_banco
  region_id                 = "aws-us-east-1"
  history_retention_seconds = 21600 # limite do plano gratuito
}

# Token que a API principal envia ao microsserviço de IA. Gerado aqui e guardado só no estado do Terraform
resource "random_password" "token_ia" {
  length  = 48
  special = false
}

# Microsserviço de IA: carrega os modelos ONNX e devolve probabilidades. Não acessa o banco.
# O endereço é público (o serviço privado do Render não é gratuito), por isso exige o token.
resource "render_web_service" "ia" {
  name              = "${var.nome}-ia"
  plan              = "free"
  region            = "virginia"
  health_check_path = "/saude"

  runtime_source = {
    docker = {
      repo_url        = "https://github.com/${var.github_repo}"
      branch          = var.branch
      dockerfile_path = "./ia/Dockerfile"
      context         = "."
      auto_deploy     = true
    }
  }

  env_vars = {
    IA_TOKEN = { value = random_password.token_ia.result }
  }
}

# Site e API principal: o Render faz o build do backend/Dockerfile a cada push na branch.
# O mesmo container serve o React e a API, então não há CORS a configurar.
resource "render_web_service" "api" {
  name              = var.nome # vira o endereço: <nome>.onrender.com
  plan              = "free"
  region            = "virginia"
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
    IA_URL       = { value = render_web_service.ia.url }
    IA_TOKEN     = { value = random_password.token_ia.result }
  }
}
