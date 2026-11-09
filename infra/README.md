# Deploy do PixoraMed

Um único container no Render serve o site e a API, e o banco fica no Neon. Tudo no plano gratuito:

| Serviço | O que roda | Observação |
|---|---|---|
| **Render** | Site React + API FastAPI, num só container (`backend/Dockerfile`) | "Dorme" após 15 min sem uso; a primeira chamada leva ~1 min |
| **Neon** | PostgreSQL | Região `aws-us-west-2` (Oregon), a mesma do Render |

O Terraform cria o banco no Neon, cria o serviço no Render apontando para o GitHub e passa o endereço do banco para a API (`DATABASE_URL`). Depois disso, cada `git push` na `main` faz o Render gerar e publicar a imagem de novo.

## Com Terraform

1. Instale o [Terraform](https://developer.hashicorp.com/terraform/install) (1.6 ou mais novo). No Windows: `winget install Hashicorp.Terraform`.
2. No Render, conecte o GitHub e dê acesso ao repositório (o Render pede para instalar o app do GitHub na primeira vez).
3. Gere as chaves: Neon (Account settings > API keys) e Render (Account settings > API keys). O `render_owner_id` aparece na URL do workspace no Render.
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
6. `terraform output url_app` mostra o endereço do app. A documentação da API fica no mesmo endereço, em `/docs`.

O `terraform.tfvars` e o `terraform.tfstate` têm segredos e ficam fora do git (`.gitignore`).

Para remover tudo da nuvem depois da apresentação: `terraform destroy`.

## No dia da apresentação

- Abra o app e faça uma previsão **uns 5 minutos antes**, para acordar o Render.
- Tenha o vídeo gravado da demo como backup, como o guia recomenda.
- Se a internet falhar, `docker compose up` roda tudo no notebook.
