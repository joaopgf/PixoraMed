---
name: ai-service-architecture
description: Arquitetura do microsserviço de IA do PixoraMed (contrato de entrada e saída, carregamento e versionamento dos modelos ONNX, pré-processamento igual ao treino, autenticação entre serviços, limites e erros). Use antes de alterar rotas, a inferência, os arquivos de models/ ou os scripts de exportação.
---

# Arquitetura do ai-service

## Papel no sistema

Um serviço sem estado que transforma uma imagem em probabilidades. Ele **não** decide a classe final (é o backend), **não** acessa banco e **não** guarda a imagem. Só o backend o chama.

```
backend --POST /predict (model_id + file, X-Internal-Token)--> main.py --> inference.py --> ONNX Runtime
```

## Módulos

| Arquivo | Responsabilidade |
|---|---|
| `app/config.py` | Variáveis de ambiente (pydantic-settings). `AI_SERVICE_TOKEN` é obrigatória |
| `app/main.py` | Rotas, token interno, limite de tamanho e conversão de erros em HTTP |
| `app/inference.py` | `ModelRegistry` (carrega os modelos), pré-processamento e execução do ONNX |
| `models/` | Pares `<id>.onnx` + `<id>.json` |
| `scripts/` | Exportação PyTorch → ONNX (roda fora do servidor) |

## Contrato

- `GET /health` (público): `{status, models}`. Usado pelo health check do Render.
- `GET /models`: lista com `id`, `cancer_type`, `mode`, `size`, `normalized`, `classes`, `description`, `metrics`, `threshold`.
- `POST /predict` (multipart `model_id`, `file`): `{model_id, cancer_type, classes, probabilities, time_ms, threshold}`; `probabilities[i]` corresponde a `classes[i]` e a soma é 1.
- JSON em snake_case (padrão Python). O backend lê com `@JsonAlias`; mudar um campo exige mudar os DTOs `AiModel`/`AiPrediction` do backend no mesmo commit.
- Erros: 401 token, 404 modelo inexistente, 413 imagem grande, 422 imagem ilegível ou pequena. O detalhe vai em `{"detail": "..."}` (padrão FastAPI) e é exibido na tela.

## Modelos e versionamento

- Cada modelo é descrito pelo próprio `.json` (classes, tamanho, escala, normalização, limiar, métricas). O código não tem nada específico de um modelo: modelo novo = par novo em `models/` + reiniciar.
- O id segue `<cancer_type>_<mode>` (`skin_color`, `oral_color`, `brain_gray`) e é gravado no histórico do backend: **não renomeie um id em uso**; publique um id novo.
- Os modelos são carregados uma vez na subida (`lifespan`). Um par com erro é ignorado e registrado no log, sem derrubar o serviço.
- Os arquivos ficam no git (o `skin_color.onnx` tem ~80 MB, perto do limite do GitHub). Alvo, se crescer: Git LFS ou armazenamento externo com download na subida.

## Pré-processamento

Precisa repetir exatamente o treino de cada modelo, senão a acurácia despenca:
- **CNN pequena:** OpenCV, BGR → RGB na cor, `IMREAD_GRAYSCALE` no cinza, resize, `(C, H, W)` e divisão por `scale`.
- **Pele (tem `mean`/`std`):** PIL, orientação EXIF, fundo branco para transparência, resize bicúbico, `/255` e normalização ImageNet; mínimo de 100 px.
- Com `threshold`, o ONNX já devolve a probabilidade calibrada da segunda classe; sem ele, devolve logits e o serviço aplica softmax.

## Autenticação entre serviços

Header `X-Internal-Token`, comparado com `hmac.compare_digest`. O valor vem de `AI_SERVICE_TOKEN` (igual no backend); em produção é gerado pelo Terraform. O endereço do Render é público, então o token é a única proteção: nunca o desative.

## Limites

- Upload de até `MAX_UPLOAD_MB` (10 MB), conferido aqui e no backend.
- `ONNX_THREADS=1`: o Render gratuito tem pouca CPU, e uma thread por CPU visível deixa a inferência lenta.
- Com 512 MB, os três modelos ocupam ~250 MB.

## Observabilidade

Log de cada modelo carregado e dos ignorados; `time_ms` em cada predição. Nunca logue a imagem.
