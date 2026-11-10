---
name: infra-architecture
description: Arquitetura de infraestrutura do PixoraMed (ambiente local com docker compose, produção com Terraform na Vercel, Render e Neon, segredos, state e cuidados com o banco que já tem dados). Use antes de alterar o docker-compose, os arquivos Terraform, variáveis de ambiente dos serviços ou o deploy.
---

# Arquitetura de infraestrutura

## Dois ambientes, duas ferramentas

| Ambiente | Ferramenta | Onde |
|---|---|---|
| Local (desenvolvimento) | `docker-compose.yml` | Postgres, ai-service, backend e Vite no computador |
| Produção | `terraform/` | Vercel (frontend), Render (backend e ai-service), Neon (banco) |

O compose nunca é usado em produção, e o Terraform nunca cria nada local.

## Serviços desacoplados

Cada serviço tem o próprio Dockerfile e contexto de build (`../backend`, `../ai-service`). Nenhum build copia arquivos de outro serviço. Eles só se conhecem por URL e variável de ambiente:

- frontend → backend: `/api` (Vite em dev; `vercel.json` em produção).
- backend → ai-service: `AI_SERVICE_URL` + `AI_SERVICE_TOKEN`.
- backend → banco: `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`.

## Segredos

- Nenhum segredo escrito em arquivo versionado. O compose lê `infra/.env` (fora do git; o modelo é `.env.example`). O Terraform lê `terraform.tfvars` (fora do git; modelo `terraform.tfvars.example`) ou `TF_VAR_*`.
- Segredos gerados pelo Terraform (`random_password`): `JWT_SECRET` e `AI_SERVICE_TOKEN`. Variáveis de entrada com segredo são `sensitive = true`, e outputs com segredo também.
- O `terraform.tfstate` contém os valores em texto: fica fora do git e precisa de backup. Alvo: state remoto e criptografado (por exemplo, HCP Terraform gratuito).

## Banco (Neon)

- O projeto do Neon **já existe e tem dados**. Ele tem `prevent_destroy`, e nenhuma mudança pode recriá-lo.
- Renomear um recurso no código exige um bloco `moved {}`; confira no `terraform plan` que o Neon aparece só como "moved".
- Mudança de schema não passa pelo Terraform (o Hibernate cria as tabelas). SQL manual é testado antes num branch do Neon.

## Render

- Plano gratuito: os serviços "dormem" após 15 minutos; a primeira chamada leva ~1 minuto (o backend espera até 120 s pela IA).
- O provedor envia o modo de manutenção em toda atualização de serviço, e o plano gratuito recusa isso. Por isso as variáveis ficam em `render_env_group`, e não em `env_vars` dos serviços.
- O endereço do ai-service é público: a proteção é o token interno.

## Vercel

- Projeto com `root_directory = "frontend"`. O `vercel.json` faz o rewrite de `/api` para o backend e o fallback da SPA. O endereço do backend nesse arquivo precisa bater com o output `backend_url`.

## Compose local

Rede interna própria, volumes nomeados (`db-data`, `frontend-node-modules`), portas só em `127.0.0.1`, `depends_on` com `service_healthy` e nenhuma senha no arquivo. O ai-service não expõe porta.

## Regras de operação

- `terraform fmt -recursive` e `terraform validate` sempre; `plan` antes de qualquer `apply`. Quem aplica é uma pessoa, depois de ler o plano.
- Provider novo ou atualização: fixe a versão exata em `versions.tf` e faça commit do `.terraform.lock.hcl`.
- Variável nova num serviço: acrescente no `.env.example` do serviço, no compose e no env group do Terraform.
