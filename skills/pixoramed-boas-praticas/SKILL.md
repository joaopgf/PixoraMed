---
name: pixoramed-boas-praticas
description: Aplique a estrutura de pastas, as convenções de código, o uso do ambiente virtual e as regras de git e segurança do PixoraMed. Use ao criar ou alterar qualquer arquivo do projeto.
---

# Boas práticas do PixoraMed

## Estrutura do repositório

```
backend/
  app/            config.py, db.py, tabelas.py, esquemas.py, autenticacao.py, cliente_ia.py, decisao.py, importacao.py, main.py, site.py, routers/
  scripts/        exportar_onnx.py, exportar_ensemble_pele.py, importar_resultados.py
  tests/          conftest.py, test_api.py, test_auth.py, test_site.py
  Dockerfile, pytest.ini, requirements.txt, requirements-dev.txt
ia/
  app/            config.py, inferencia.py, main.py
  tests/          test_ia.py
  Dockerfile, pytest.ini, requirements.txt, requirements-dev.txt
frontend/
  public/         icone.svg, imagens
  src/            api.ts, dados.ts, estado.tsx, modulos.ts, main.tsx, App.tsx, components/, pages/, styles/
  Dockerfile, nginx.conf
models/           <id>.onnx + <id>.json, README.md
data/             resultados.csv
docs/             processo_bpmn.png, salvar_modelo.md
infra/terraform/  main.tf, variables.tf, outputs.tf, versions.tf, terraform.tfvars.example
docker-compose.yml, .env.example, .gitignore, .gitattributes, .dockerignore, README.md
```

Os notebooks de treino ficam no repositório separado **Projeto-ML-Cancer**.

## Arquivos de apoio

`backend/requirements-dev.txt`:

```
-r requirements.txt
pytest>=8.3
httpx>=0.28
onnx>=1.17
onnxscript>=0.1
```

`backend/pytest.ini`:

```ini
[pytest]
pythonpath = .
testpaths = tests
```

`.env.example` (na raiz, como referência; os valores reais vão em `backend/.env` e `frontend/.env.local`, fora do git):

```
# DATABASE_URL=postgresql://usuario:senha@host/pixoramed?sslmode=require
# CORS_ORIGINS=http://localhost:5173
# IMPORTAR_CSV_NO_INICIO=true
# VITE_API_URL=https://pixoramed-api.onrender.com
```

`models/README.md` explica o par `.onnx` e `.json`. `docs/salvar_modelo.md` explica como salvar o `.pt` no notebook, converter e reiniciar a API.

## Código

- Escreva em **português** nomes de domínio, variáveis e funções (`prever`, `classe_prevista`), seguindo o estilo do projeto. Mantenha em inglês os termos das bibliotecas.
- Python: `snake_case` em funções e variáveis, `PascalCase` em classes e `UPPER_SNAKE_CASE` em constantes. Use type hints quando esclarecerem o contrato.
- TypeScript: `camelCase` em variáveis, `PascalCase` em componentes e arquivos de página, `strict` ativado.
- Prefira soluções simples. Não crie abstrações, configurações ou tratamentos para casos que não existem.
- Trate erros específicos e não esconda falhas. Valide dados nos limites da aplicação.
- Comentários explicam o motivo, não o óbvio. Mantenha-os em português.
- Textos da interface e mensagens de erro ficam em português do Brasil.

## Ambiente virtual

Use sempre o ambiente virtual do backend. Nunca use `python`, `pip` ou ferramentas globais para o projeto.

```sh
# Windows
backend\.venv\Scripts\python -m pip install -r backend\requirements-dev.txt
# Linux e Mac
backend/.venv/bin/python -m pip install -r backend/requirements-dev.txt
```

Se `.venv` não existir, crie com `python -m venv .venv` dentro de `backend/`. Instale o PyTorch de CPU só para converter modelos; ele não vai para produção.

## Git e arquivos

- Faça commit e push **somente quando o usuário pedir**. Cada pedido vale apenas para aquele trabalho.
- Mensagens de commit em português, no imperativo presente: "Adiciona...", "Corrige...".
- Nunca faça commit de segredos, `.env`, `*.tfvars`, `*.tfstate` nem de `.pt`.
- Fins de linha LF, porque os arquivos vão para contêineres Linux.

`.gitattributes`:

```
* text=auto eol=lf
*.csv -text
*.onnx binary
*.png binary
```

`.gitignore` deve cobrir: `.venv/`, `__pycache__/`, `*.pyc`, `.pytest_cache/`, `node_modules/`, `frontend/dist/`, `*.tsbuildinfo`, `data/*.db`, `modelos_pt/`, `*.pt`, `.env`, `*.tfvars` (exceto `*.tfvars.example`), `.terraform/`, `*.tfstate`, `*.tfstate.*`.

Arquivos grandes: o `pele_cor.onnx` tem cerca de 80 MB, perto do limite de 100 MB do GitHub, e fica no histórico para sempre. Confirme com o usuário antes do push.

## Antes de alterar o que já existe

Leia o arquivo e o que depende dele. Não apague nem sobrescreva dados, modelos ou trabalho do usuário sem confirmação. Antes de escrever em um banco ou API de teste, confirme que é mesmo o ambiente de teste: a porta 8000 pode estar ocupada pelo Docker do usuário.
