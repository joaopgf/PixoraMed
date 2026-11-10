# infra

Tudo que é infraestrutura do PixoraMed fica aqui, separado do código dos serviços:

- `docker-compose.yml`: ambiente **local** de desenvolvimento.
- `terraform/`: ambiente de **produção** (Vercel, Render e Neon).

## docker-compose (só desenvolvimento local)

Sobe os quatro serviços no seu computador, numa rede interna própria:

| Serviço | O que é | Porta no seu computador |
|---|---|---|
| `db` | PostgreSQL 17, com os dados num volume (`db-data`) | `127.0.0.1:5432` (ou `DB_PORT`), para pgAdmin |
| `ai-service` | build de `../ai-service` | nenhuma (só o backend acessa) |
| `backend` | build de `../backend` | `127.0.0.1:8080` |
| `frontend` | Vite em modo desenvolvimento, com o código montado | `127.0.0.1:5173` |

```bash
cd infra
copy .env.example .env        # Linux/Mac: cp .env.example .env  e troque as senhas
docker compose up --build     # site em http://localhost:5173
docker compose down           # para tudo (os dados ficam no volume)
docker compose down -v        # para tudo e apaga o banco local
```

Proteção das informações: nenhuma senha fica no `docker-compose.yml`. Usuário e senha do banco, `JWT_SECRET` e `AI_SERVICE_TOKEN` vêm do `infra/.env`, que fica fora do git (o modelo versionado é o `.env.example`). As portas só abrem em `127.0.0.1`, então não ficam acessíveis na rede. Cada serviço espera o anterior ficar saudável (`depends_on` com `service_healthy`).

Produção **não** usa o compose.

### Por que não tem mais nginx

O nginx servia o build do React e repassava `/api` ao backend dentro do compose. Agora o site fica na Vercel (que já serve os arquivos e faz o repasse pelo `vercel.json`), o backend responde a API direto no Render e, no desenvolvimento, quem repassa `/api` é o próprio Vite. Ele não tinha mais função, então foi removido.

## Terraform (produção)

| Recurso | Provedor | Observação |
|---|---|---|
| `vercel_project.frontend` | Vercel | builda `frontend/` a cada push; domínio `<project_name>.vercel.app` |
| `render_web_service.backend` | Render | `backend/Dockerfile`, health check `/api/health` |
| `render_web_service.ai_service` | Render | `ai-service/Dockerfile`, health check `/health`, protegido pelo token interno |
| `render_env_group.*` | Render | variáveis dos dois serviços (senha do banco, JWT, token) |
| `neon_project.database` | Neon | **já existe e tem dados**; `prevent_destroy` impede apagar ou recriar |
| `random_password.*` | — | gera o `JWT_SECRET` e o `AI_SERVICE_TOKEN` |

Os providers têm versão fixa em `versions.tf`.

### Segredos

- Tokens dos provedores (`neon_api_key`, `render_api_key`, `vercel_api_token`) são variáveis `sensitive` e vêm do `terraform.tfvars` (fora do git) ou de `TF_VAR_*`. O modelo versionado é o `terraform.tfvars.example`.
- Nenhum valor secreto está escrito nos `.tf`: senha do Neon, JWT e token interno passam de recurso para recurso.
- O `terraform.tfstate` guarda esses valores em texto e fica **fora do git**. Ele está só no computador de quem roda o Terraform: faça backup dele (perdê-lo faz o Terraform "esquecer" os recursos).

### Aplicando as mudanças desta refatoração

Os recursos já existiam com nomes em português. Os blocos `moved` no `main.tf` renomeiam no state sem destruir nada.

1. Acrescente `vercel_api_token` ao seu `terraform.tfvars` (Vercel > Account settings > Tokens) e conecte o GitHub na Vercel.
2. `terraform init -upgrade`
3. `terraform plan` e **confira**: o Neon deve aparecer só como "moved", nunca como "destroy". Os serviços do Render aparecem como atualização (Dockerfile e pasta novos).
4. `terraform apply`
5. Confira se o domínio da Vercel ficou `https://pixoramed.vercel.app`; se ficou outro, ajuste o `local.frontend_url` e aplique de novo.

Observação: o provedor do Render tenta mudar o modo de manutenção em toda atualização de serviço, e o plano gratuito recusa isso. Por isso as variáveis ficam em env groups. Se a atualização dos serviços falhar por esse motivo, ajuste o Dockerfile e o health check no painel do Render e rode `terraform apply -refresh-only`.

Para remover tudo depois da apresentação, tire o `prevent_destroy` do Neon e rode `terraform destroy`.

## No dia da apresentação

- Abra o site e faça uma análise **uns 5 minutos antes**, para acordar os dois serviços do Render (a primeira chamada pode passar de 1 minuto).
- Se a internet falhar, `docker compose up` roda tudo no notebook.
