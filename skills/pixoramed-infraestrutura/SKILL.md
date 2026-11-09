---
name: pixoramed-infraestrutura
description: Crie os contêineres e o provisionamento do PixoraMed com Docker Compose e Terraform para Neon e Render. Use ao criar ou alterar Dockerfiles, compose, nginx, variáveis de ambiente ou o deploy. Não aplique mudanças na nuvem sem autorização.
---

# Infraestrutura

## Local: `docker-compose.yml`

Três serviços:

- **`db`:** `postgres:17-alpine`, com banco, usuário e senha `pixoramed` (só para uso local), volume `dados_db`, porta `5433:5432` e healthcheck com `pg_isready -U pixoramed`.
- **`backend`:** build com `context: .` e `dockerfile: backend/Dockerfile`, `DATABASE_URL=postgresql://pixoramed:pixoramed@db:5432/pixoramed`, `CORS_ORIGINS=http://localhost:8080,http://localhost:5173`, volume `./models:/app/models:ro`, porta `8000:8000` e dependência de `db` saudável.
- **`frontend`:** build de `./frontend`, porta `8080:80`, depende de `backend`.

Comandos: `docker compose up --build` (app em `http://localhost:8080`, API em `http://localhost:8000/docs`). Sem `--build`, a interface antiga continua. **Nunca rode `down -v` sem pedido: apaga o banco.**

## `backend/Dockerfile`

```dockerfile
FROM node:22-alpine AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1     PYTHONUNBUFFERED=1     MODELS_DIR=/app/models     RESULTADOS_CSV=/app/data/resultados.csv     FRONTEND_DIR=/app/frontend
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/app ./app
COPY backend/scripts ./scripts
COPY models ./models
COPY data/resultados.csv ./data/resultados.csv
COPY --from=frontend /frontend/dist ./frontend
EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
```

## `frontend/Dockerfile` e `nginx.conf`

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

`frontend/.dockerignore`: `node_modules` e `dist`. O `.dockerignore` da raiz não vale aqui, porque o contexto deste build é `./frontend`.

**O `npm ci` exige lockfile sincronizado.** Antes de considerar a etapa pronta, rode `npm ci` em `frontend/`. O build local não detecta esse erro.

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    client_max_body_size 11m;
    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
    }
    location / {
        try_files $uri /index.html;
    }
}
```

`.dockerignore`: `**/.venv`, `**/__pycache__`, `**/.pytest_cache`, `**/node_modules`, `frontend/dist`, `data/*.db`, `.git`, `infra`.

## Nuvem: Render e Neon

| Serviço | Papel |
|---|---|
| Render | Um único container (`backend/Dockerfile`) com o site React e a API, plano gratuito, região `oregon` |
| Neon | PostgreSQL, região `aws-us-west-2` |

O `backend/Dockerfile` tem duas etapas: `node:22-alpine` roda `npm ci` e `npm run build` em `frontend/`, e a imagem `python:3.12-slim` recebe o `dist/` em `/app/frontend` (`FRONTEND_DIR`). Em `app/site.py`, `registrar_site` cria uma rota `GET /{caminho:path}`, registrada depois de todas as rotas da API: devolve o arquivo pedido dentro da pasta, ou o `index.html` com `Cache-Control: no-cache` para as rotas do React Router, e responde 404 para caminhos em `api/`. O `main.py` só a registra se `FRONTEND_DIR/index.html` existir. Como o site e a API ficam na mesma origem, não há CORS a configurar. No Docker Compose, o nginx continua servindo o frontend em `localhost:8080`.

`infra/terraform/versions.tf`:

```hcl
terraform {
  required_version = ">= 1.6"
  required_providers {
    neon   = { source = "kislerdm/neon", version = ">= 0.6" }
    render = { source = "render-oss/render", version = ">= 1.3" }
  }
}

provider "neon" {
  api_key = var.neon_api_key
}

provider "render" {
  api_key  = var.render_api_key
  owner_id = var.render_owner_id
}
```

`variables.tf`: `neon_api_key` e `render_api_key` (ambas `sensitive`), `render_owner_id`, `github_repo`, `branch` (padrão `main`) e `nome` (padrão `pixoramed`).

`main.tf`:

```hcl
resource "neon_project" "banco" {
  name                      = var.nome
  region_id                 = "aws-us-west-2"
  history_retention_seconds = 21600
}

resource "render_web_service" "api" {
  name              = var.nome
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
```

`outputs.tf`: `url_app` (`render_web_service.api.url`, que serve o site e a API) e `database_url` (`neon_project.banco.connection_uri`, `sensitive`). Crie `terraform.tfvars.example` sem valores reais.

## Cuidados com o deploy

- **Autorização:** `init`, `validate` e `plan` não criam nada. **Só rode `terraform apply` depois que o usuário vir o plano e autorizar.**
- **Segredos:** peça ao usuário que preencha o `terraform.tfvars`. Nunca peça tokens no chat nem os grave em arquivos versionados. O `terraform.tfstate` também guarda segredos.
- **Pré-requisitos:** repositório no GitHub, com acesso liberado ao Render. O Render faz o build a partir do GitHub, então os commits precisam estar lá antes.
- **Endereço:** o nome do serviço vira `<nome>.onrender.com`. Se o nome já estiver em uso, o Render acrescenta um sufixo; use sempre `terraform output url_app`.
- **Treinos no Docker:** o `resultados.csv` vai dentro da imagem. Depois de atualizar o arquivo, rode `docker compose up --build`.
- **Recursos:** o plano gratuito tem 512 MB e 0,1 de CPU. A API deve usar um único processo: o pico medido foi de 393 MB, e um segundo processo com a Pele derrubou o contêiner.
- **Dia da apresentação:** o Render gratuito dorme. Abra o app alguns minutos antes, faça uma previsão por módulo e mantenha o Docker local e o vídeo como reserva.

## Teste de capacidade

Antes do deploy, teste em um projeto Docker separado, com portas e banco próprios: use `-p pixoramed_teste` e um arquivo extra com `mem_limit: 512m`, `memswap_limit: 512m`, `cpus: 0.1` e `ports: !override`. Assim, o banco do usuário não é tocado.

Referência com 1 thread: API respondendo em cerca de 39 s, previsões de 0,1 s no Cérebro, 0,2 s no Oral e 1,7 s na Pele.

## Verificação

Se Docker ou Terraform não estiverem disponíveis, não declare a etapa pronta: relate o que ficou sem verificar. Rode `npm ci`, `terraform fmt -check`, `terraform init` e `terraform validate`, `docker compose up --build`, o fluxo completo pelo nginx (`localhost:8080`) e o teste de capacidade. Esse teste só imita os limites: o Render real precisa ser testado depois do deploy.
