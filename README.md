# PixoraMed

Classificação de imagens médicas de câncer (Pele, Oral e Cérebro) com redes neurais, e um site para fazer análises e acompanhar o histórico de resultados.

**Acesse o sistema:** [pixoramed.vercel.app](https://pixoramed.vercel.app)

> O backend e a IA ficam no plano gratuito do Render e dormem depois de 15 minutos sem uso: a primeira análise pode levar cerca de 1 minuto.

Projeto integrador do Bootcamp de IA (TCS / SENAI Londrina, 2026). Os notebooks de treino ficam no repositório **Projeto-ML-Cancer**; este repositório tem o sistema que usa os modelos treinados lá.

> **Aviso:** ferramenta acadêmica. Não é um dispositivo médico e não faz diagnóstico.

## Arquitetura

Três serviços independentes, cada um na sua pasta, com Dockerfile, README, `.env.example` e skills próprios:

```
Navegador ──► frontend (React + Vite, Vercel)
                 │  /api/*  (rewrite do vercel.json)
                 ▼
              backend (Spring Boot, Render) ──SQL──► PostgreSQL (Neon)
                 │  HTTP + header X-Internal-Token
                 ▼
              ai-service (FastAPI + ONNX Runtime, Render)
```

- **frontend** só mostra as telas e chama `/api`. Não tem segredo nenhum no código.
- **backend** faz login (JWT), guarda o histórico, importa os resultados dos treinos e decide a classe final (inconclusivo, limiar da Pele) com as probabilidades que vêm da IA.
- **ai-service** carrega os modelos ONNX, pré-processa a imagem como no treino e devolve só as probabilidades. Não acessa o banco e não guarda a imagem.

| Camada | Tecnologia | Onde roda |
|---|---|---|
| Frontend | React 19, Vite, React Router, TanStack Query, Recharts | Vercel |
| Backend | Java 21, Spring Boot 4, Spring Data JPA, Spring Security (JWT), Maven | Render (Docker) |
| ai-service | Python 3.12, FastAPI, ONNX Runtime, OpenCV, Pillow | Render (Docker) |
| Banco | PostgreSQL | Neon (produção) · container (desenvolvimento) |
| Infra | Docker Compose (local) e Terraform (nuvem) | `infra/` |

## Estrutura

```
backend/      API Spring Boot (controller, service, repository, model, dto, security, exception)
frontend/     site React (api, auth, context, hooks, components, pages, utils)
ai-service/   microsserviço de IA, modelos ONNX (models/) e scripts de exportação (scripts/)
infra/        docker-compose.yml (desenvolvimento local) e terraform/ (Vercel, Render e Neon)
docs/         workflows BPMN, documento de entrega (delivery/), guia de estudo para a banca (study_guide.md),
              guia para salvar modelos, glossário PT→EN e o deck
```

Cada pasta tem um `README.md` com os detalhes, um `CLAUDE.md` e as skills de arquitetura em `.claude/skills/`.

## Rodando localmente

Pré-requisito: Docker Desktop.

```bash
cd infra
copy .env.example .env        # Linux/Mac: cp .env.example .env  (depois troque as senhas)
docker compose up --build
```

Site em http://localhost:5173 e API em http://localhost:8080/api/health. Para rodar um serviço fora do Docker (Java 21 + Maven, Python 3.12, Node 22), veja o README da pasta dele.

## Deploy

Veja [infra/README.md](infra/README.md): o Terraform cria o projeto da Vercel e os dois serviços do Render e usa o banco do Neon que já existe.

## Workflows (BPMN 2.0)

Três processos em `docs/bpmn/`, que abrem em [bpmn.io](https://demo.bpmn.io) e no Camunda Modeler:

| Workflow | O que mostra |
|---|---|
| `1_login` | Cadastro e login: senha com hash BCrypt e token JWT guardado só no navegador |
| `2_ai_service` | Como o backend chama o ai-service (token interno, validações e decisão da classe) |
| `3_system_usage` | Uma análise completa, do módulo escolhido até o resultado |

Os diagramas são gerados por `docs/bpmn/generator/generate.py`. Para mudar um processo, edite as etapas lá, rode `python generate.py` dentro dessa pasta e exporte os PNGs de novo (por exemplo, pelo bpmn.io).

## Modelos

| Módulo | Modelo | Entrada | Saída | Arquivo |
|---|---|---|---|---|
| Oral | CNN pequena (~24 mil parâmetros) | 128×128, cor | `normal` ou `scc` | `oral_color` (~110 KB) |
| Cérebro | CNN pequena (~24 mil parâmetros) | 128×128, cinza | `glioma`, `menin` ou `tumor` | `brain_gray` (~110 KB) |
| Pele | Ensemble de 5 EfficientNet-B0 com calibração de Platt | 224×224, cor, normalização ImageNet | `benign` ou `malignant`, com limiar de 18% | `skin_color` (~80 MB) |

Em Oral e Cérebro, o backend responde `inconclusive` quando a confiança fica abaixo de 80% (`INCONCLUSIVE_THRESHOLD`). A Pele usa o limiar próprio e a tela mostra um aviso de baixa certeza.

## Datasets e créditos

Os modelos foram treinados com dois datasets públicos do Kaggle, ambos com licença [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) (crédito obrigatório, sem uso comercial, mesma licença para derivados). As imagens não ficam neste repositório.

- **Multi Cancer Dataset** (Oral e Cérebro): Obuli Sai Naren. (2022). *Multi Cancer Dataset* [Data set]. Kaggle. https://doi.org/10.34740/KAGGLE/DSV/3415848
- **Skin Cancer MNIST: HAM10000** (Pele), publicado no Kaggle por K Scott Mader: Tschandl, P., Rosendahl, C. & Kittler, H. (2018). The HAM10000 dataset, a large collection of multi-source dermatoscopic images of common pigmented skin lesions. *Scientific Data*, 5, 180161. https://doi.org/10.1038/sdata.2018.161

## Limitação técnica e trabalhos futuros

O protótipo não verifica se a imagem é compatível com o módulo escolhido: uma imagem sem relação também recebe uma das classes do treino. Como trabalho futuro, um filtro poderia recusar essas imagens antes da classificação.

## Privacidade

A imagem enviada é processada em memória e descartada. A tabela `predictions` guarda só o modelo, a classe prevista, a confiança, o tempo, o horário e o usuário. Cada usuário vê só o próprio histórico.
