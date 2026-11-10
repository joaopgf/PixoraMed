# ai-service

Microsserviço de IA do PixoraMed em **Python 3.12 + FastAPI + ONNX Runtime**. Carrega os modelos de `models/` na subida, pré-processa cada imagem como nos notebooks de treino e devolve só as probabilidades. Não acessa banco, não guarda a imagem e não decide a classe final (isso é do backend).

## Rotas

| Método | Rota | Token? | O que faz |
|---|---|---|---|
| GET | `/health` | não | Status e quantidade de modelos carregados |
| GET | `/models` | sim | Modelos carregados (`id`, `cancer_type`, `mode`, `classes`, `threshold`...) |
| POST | `/predict` | sim | Recebe `model_id` + `file` (multipart) e devolve `probabilities` na ordem de `classes` |

Documentação interativa em `/docs` quando o serviço está rodando.

## Token interno (AI_SERVICE_TOKEN)

O "token da IA" é a autenticação entre serviços: o backend envia o header `X-Internal-Token` e o ai-service recusa com 401 qualquer chamada a `/models` e `/predict` sem o token certo (comparação em tempo constante). O valor vem da variável `AI_SERVICE_TOKEN`, igual nos dois serviços:

- **Local:** definido no `infra/.env` (compose) ou no `ai-service/.env`.
- **Produção:** gerado aleatoriamente pelo Terraform e passado aos dois serviços. Para trocar, rode `terraform apply -replace=random_password.ai_service_token`.
- Sem a variável, o serviço não sobe.

Não existe chave de provedor de modelo (OpenAI etc.): os modelos são arquivos ONNX locais.

## Dependências

Um único [`requirements.txt`](requirements.txt), com versões fixas e agrupado em execução e testes. Os testes (pytest e httpx) somam poucos MB à imagem.

## Pasta `scripts`

Convertem os modelos treinados nos notebooks (PyTorch, `.pt`) para o par `.onnx` + `.json` que o serviço carrega. Rodam só na máquina de quem exporta, nunca no servidor, e precisam do PyTorch, que fica fora do `requirements.txt` para não pesar a imagem (~700 MB):

```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
```

| Script | Para que serve | Quando rodar | Argumentos | Efeitos |
|---|---|---|---|---|
| `export_onnx.py` | Converte a CNN pequena (Oral, Cérebro) | Quando chega um `.pt` novo de um notebook | `checkpoint` (caminho do `.pt`); opcionais `--id`, `--output`, `--cancer-type`, `--mode`, `--classes`, `--scale`, `--size`, `--description` | Cria ou sobrescreve `models/<id>.onnx` e `.json`; confere se o ONNX dá a mesma saída que o PyTorch |
| `export_skin_ensemble.py` | Junta os 5 EfficientNet-B0 calibrados da Pele em um ONNX | Só se o pacote da Pele for refeito | `package` (pasta `HAM10000_PACOTE_INFERENCIA`); opcionais `--id`, `--output` | Cria ou sobrescreve `models/skin_color.onnx` e `.json` |

Nenhum script mexe em banco ou em dados de usuário. Passo a passo completo em [`docs/save_model.md`](../docs/save_model.md).

## Rodando sem Docker

```bash
cd ai-service
python -m venv .venv
.venv\Scripts\activate          # Linux/Mac: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env          # Linux/Mac: cp .env.example .env  (e preencha o token)
uvicorn app.main:app --reload --port 8001
```

## Testes

```bash
pytest
```

Usam os três modelos reais de `models/` e conferem token, formatos de entrada e soma das probabilidades.
