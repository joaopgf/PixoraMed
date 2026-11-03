# Deploy do PixoraMed

Tudo no plano gratuito:

| Serviço | O que roda | Observação |
|---|---|---|
| **Neon** | PostgreSQL | Região `aws-us-west-2` (Oregon), a mesma da API |
| **Render** | API (Docker, `backend/Dockerfile`) | "Dorme" após 15 min sem uso; a primeira chamada leva ~1 min |
| **Vercel** | Frontend (pasta `frontend/`) | `VITE_API_URL` aponta para o Render |

## Com Terraform

1. Instale o [Terraform](https://developer.hashicorp.com/terraform/install) (1.6 ou mais novo).
2. Suba o repositório para o GitHub e dê acesso a ele no Render e na Vercel (os dois pedem para instalar o app do GitHub na primeira vez).
3. Gere as chaves: Neon (Account settings > API keys), Render (Account settings > API keys) e Vercel (Account > Tokens). O `render_owner_id` aparece na URL do workspace no Render.
4. Preencha o arquivo de variáveis:
   ```bash
   cd infra/terraform
   copy terraform.tfvars.example terraform.tfvars
   ```
5. Crie a infraestrutura:
   ```bash
   terraform init
   terraform plan
   terraform apply
   ```
6. `terraform output url_app` mostra o endereço do app.

O `terraform.tfvars` e o `terraform.tfstate` têm segredos e ficam fora do git (`.gitignore`).

## No dia da apresentação

- Abra o app e faça uma previsão **uns 5 minutos antes**, para acordar a API no Render.
- Tenha o vídeo gravado da demo como backup, como o guia recomenda.
- Se a internet falhar, `docker compose up` roda tudo no notebook.
