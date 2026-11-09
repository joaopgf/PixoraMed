---
name: pixoramed-backend
description: Crie a API principal do PixoraMed (FastAPI, login, histórico e regras de decisão) e o microsserviço de IA (ONNX Runtime, pré-processamento e inferência), além do contrato usado pelo front. Use ao criar ou alterar rotas, esquemas, configuração ou a lógica de previsão.
---

# Backend

Dois serviços em Docker. **API principal** (`backend/`): FastAPI, SQLAlchemy 2, Pandas, pydantic-settings e httpx; não carrega modelos. **Microsserviço de IA** (`ia/`): FastAPI, ONNX Runtime na CPU, OpenCV e Pillow; não acessa o banco. Consulte `pixoramed-banco-dados` para as tabelas e `pixoramed-regras-do-produto` para as decisões.

`backend/requirements.txt`: `fastapi>=0.115`, `uvicorn[standard]>=0.32`, `python-multipart>=0.0.12`, `pydantic-settings>=2.6`, `sqlalchemy>=2.0`, `psycopg[binary]>=3.2`, `pandas>=2.2`, `httpx>=0.28`. `backend/requirements-dev.txt` acrescenta `pytest`, `onnx`, `onnxscript`, `onnxruntime` e `numpy`, usados pelos scripts de exportação.

`ia/requirements.txt`: `fastapi>=0.115`, `uvicorn[standard]>=0.32`, `python-multipart>=0.0.12`, `pydantic-settings>=2.6`, `numpy>=2.0`, `opencv-python-headless>=4.10`, `pillow>=10.0`, `onnxruntime>=1.20`. `ia/requirements-dev.txt` acrescenta `pytest` e `httpx`. O PyTorch **não** entra em nenhum dos dois.

## Configuração da API principal: `backend/app/config.py`

`BaseSettings`, com `env_file=".env"` (a API roda de dentro de `backend/`, então o arquivo é `backend/.env`) e `extra="ignore"`. A raiz do projeto é `Path(__file__).resolve().parents[2]`:

| Variável | Padrão | Uso |
|---|---|---|
| `DATABASE_URL` | SQLite em `data/pixoramed.db` | Conexão |
| `RESULTADOS_CSV` | `data/resultados.csv` | Treinos |
| `IMPORTAR_CSV_NO_INICIO` | `true` | Importação na partida |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:8080` | Origens, separadas por vírgula |
| `MAX_UPLOAD_MB` | `10` | Limite do arquivo |
| `LIMIAR_INCONCLUSIVO` | `0.8` | Inconclusivo e baixa certeza |
| `SESSAO_HORAS` | `8` | Validade da sessão de login |
| `IA_URL` | `http://localhost:8001` | Endereço do microsserviço de IA |
| `IA_TOKEN` | vazio | Token enviado à IA no cabeçalho `X-Token-IA`; o mesmo configurado na IA |
| `IA_TIMEOUT` | `120` | Segundos de espera pela IA (no Render gratuito ela pode estar dormindo) |

## Microsserviço de IA: `ia/`

Configuração (`ia/app/config.py`): `MODELS_DIR` (`models/` na raiz), `IA_TOKEN` (vazio), `MAX_UPLOAD_MB` (`10`) e `ONNX_THREADS` (`1`).

Rotas (`ia/app/main.py`), com os modelos carregados uma vez no `lifespan`, em `app.state.registro`:

| Rota | Resposta |
|---|---|
| `GET /saude` | Pública: `{"status": "ok", "modelos": n}`. É o health check do Render |
| `GET /modelos` | `ModeloIA`: `id`, `cancer`, `modo`, `tamanho`, `normalizado` (`escala != 1`), `classes`, `descricao`, `metricas`, `limiar` |
| `POST /prever` | Multipart com `modelo_id` e `arquivo`. `PrevisaoIA`: `modelo_id`, `cancer`, `classes`, `probabilidades` (na ordem de `classes`), `tempo_ms`, `limiar`. Modelo inexistente: 404; acima do limite: 413; `ImagemInvalida`: 422 |

`/modelos` e `/prever` exigem o cabeçalho `X-Token-IA` igual a `IA_TOKEN`, conferido com `hmac.compare_digest`; senão, 401. Sem `IA_TOKEN` configurado, recusam tudo e registram um aviso no log. A IA não decide a classe, não acessa banco e não guarda a imagem.

### Inferência: `ia/app/inferencia.py`

**Carga:** `RegistroModelos` lê cada `*.json` de `models/` e cria uma sessão ONNX. Capture `Exception` em cada modelo: um modelo inválido é registrado no log e ignorado, sem derrubar a API. Sem modelos, a API continua funcionando.

`ModeloCarregado` guarda `id`, `cancer`, `modo`, `tamanho`, `escala`, `classes`, `sessao`, `descricao`, `metricas`, `media`, `desvio` e `limiar`. O nome da entrada vem de `sessao.get_inputs()[0].name`.

**Sessão:** o padrão do ONNX Runtime cria uma thread por CPU visível, e elas disputam a CPU em servidores limitados. Isso deixou a Pele em cerca de 20 s por imagem; com 1 thread, caiu para 1,7 s.

```python
opcoes = ort.SessionOptions()
opcoes.intra_op_num_threads = settings.onnx_threads
opcoes.inter_op_num_threads = 1
opcoes.add_session_config_entry("session.intra_op.allow_spinning", "0")
```

**`preprocessar(conteudo, modo, tamanho, escala)`, para Oral e Cérebro:**

```python
buffer = np.frombuffer(conteudo, dtype=np.uint8)
if buffer.size == 0:  # sem isto, o cv2.imdecode lança erro e a API responde 500
    raise ImagemInvalida("Não foi possível ler a imagem. Envie um arquivo JPG ou PNG.")
flag = cv2.IMREAD_COLOR if modo == "cor" else cv2.IMREAD_GRAYSCALE
imagem = cv2.imdecode(buffer, flag)
if imagem is None:
    raise ImagemInvalida("Não foi possível ler a imagem. Envie um arquivo JPG ou PNG.")
if modo == "cor":
    imagem = cv2.cvtColor(imagem, cv2.COLOR_BGR2RGB)
imagem = cv2.resize(imagem, (tamanho, tamanho))
imagem = imagem.transpose(2, 0, 1) if modo == "cor" else imagem[np.newaxis]
return imagem[np.newaxis].astype(np.float32) / np.float32(escala)
```

**`preprocessar_pil(conteudo, tamanho, media, desvio)`, para a Pele**, usado quando o `.json` traz `media` e `desvio`:

1. Aceite só os formatos JPEG, PNG, WEBP, BMP e TIFF, abrindo com o PIL.
2. Aplique `ImageOps.exif_transpose`.
3. Para RGBA, LA ou paleta com transparência, componha sobre fundo branco. Depois, converta para RGB.
4. Recuse imagem com lado menor que 100 pixels: "Imagem muito pequena. O mínimo é 100x100 pixels."
5. Redimensione com `Image.Resampling.BICUBIC`, divida por 255, normalize com `media` e `desvio` e devolva `(1, 3, H, W)` em `float32`.

Converta erros de leitura (`OSError`, `ValueError`, `Image.DecompressionBombError`) em `ImagemInvalida`.

**`prever(modelo, conteudo)`** devolve uma probabilidade por classe:

- Com `limiar`: `positiva = saida.reshape(-1)[0]` e `[1 - positiva, positiva]`.
- Sem `limiar`: softmax dos logits, com `exp(logits - logits.max())` para estabilidade.

## Decisão: `backend/app/decisao.py`

A IA devolve probabilidades; a API principal decide:

```python
def indice_previsto(probabilidades, limiar):
    if limiar is not None:
        return 1 if probabilidades[1] >= limiar else 0
    return max(range(len(probabilidades)), key=probabilidades.__getitem__)

def limiar_inconclusivo(limiar):
    return None if limiar is not None else settings.limiar_inconclusivo

def limiar_baixa_certeza(limiar):
    return settings.limiar_inconclusivo if limiar is not None else None
```

`decidir(probabilidades, classes, limiar)` devolve a classe final, ou `inconclusivo` quando há limiar de inconclusivo e a confiança fica abaixo dele, e a confiança, que é a probabilidade do índice previsto.

## Cliente da IA: `backend/app/cliente_ia.py`

`ClienteIA(url, token, timeout, transport=None)` usa um `httpx.AsyncClient` com o cabeçalho `X-Token-IA`. Respostas 404, 413 e 422 da IA viram `RecusaDaIA(status, detalhe)`, repassada ao navegador com o mesmo status. Falha de conexão, tempo esgotado, 401 (token errado, registrado no log) ou outro erro viram `ServicoIAIndisponivel`, que a API responde com 503 e `O serviço de IA está indisponível no momento. Tente de novo em instantes.` `listar_modelos()` guarda a lista por 5 minutos. O parâmetro `transport` serve para os testes.

## Contrato da API

Inclua os routers `auth`, `treinos`, `modelos` e `previsoes`. CORS só com `GET` e `POST` e os cabeçalhos `Authorization` e `Content-Type`. Documentação em `/docs`.

| Rota | Resposta |
|---|---|
| `POST /api/auth/cadastro` | 201 com `SessaoOut`; e-mail repetido dá 409 |
| `POST /api/auth/login` | `SessaoOut`; e-mail inexistente ou senha errada dão 401 com a mesma mensagem, `E-mail ou senha incorretos.` |
| `GET /api/auth/eu` | `UsuarioOut` (exige login) |
| `POST /api/auth/sair` | 204, apaga a sessão (exige login) |
| `GET /api/saude` | `{"status": "ok"}`. **Não consulta a IA**: o Render usa esta rota como health check, e a IA pode estar dormindo |
| `GET /api/treinos?cancer=&modo=&normalizado=` | Lista de treinos, ordenada por `cancer`, `modo` e `data_hora` |
| `GET /api/treinos/canceres` | Lista de nomes |
| `GET /api/modelos` | Modelos vindos da IA, com os limiares de decisão, ordenados por `cancer` e `modo`; IA fora do ar: 503 |
| `POST /api/previsoes` | Multipart, com `modelo_id` e `arquivo` (exige login; grava `usuario_id`) |
| `GET /api/previsoes?limite=20` | Histórico **do usuário logado**, mais recente primeiro, com `limite` entre 1 e 100 |

**`ModeloOut`:** os campos de `ModeloIA`, mais `limiar_inconclusivo` e `limiar_baixa_certeza` calculados em `decisao.py`: `id`, `cancer`, `modo`, `tamanho`, `normalizado`, `classes`, `descricao`, `metricas`, `limiar`, `limiar_inconclusivo`, `limiar_baixa_certeza`.

**`PrevisaoOut`:** `id`, `modelo_id`, `cancer`, `classe_prevista`, `confianca`, `probabilidades` (lista de `classe` e `probabilidade`, em ordem decrescente), `limiar`, `limiar_inconclusivo`, `limiar_baixa_certeza`, `tempo_ms`, `aviso`.

**`PrevisaoHistorico`:** `id`, `criado_em`, `modelo_id`, `classe_prevista`, `confianca`, `tempo_ms`.

**`TreinoOut`:** todas as colunas da tabela `treinos`.

**Autenticação (`app/autenticacao.py`, `app/routers/auth.py`):** sem dependências novas, só a biblioteca padrão.

- `CadastroIn`: `nome` (2 a 80, espaços repetidos removidos), `email` (até 254, formato `algo@dominio.tld`) e `senha` (8 a 128). Limpe nome e e-mail com `field_validator(mode="before")`, antes de conferir tamanho e formato; o e-mail vai para minúsculas. `LoginIn`: `email` e `senha`. `UsuarioOut`: `id`, `nome`, `email`, `criado_em`. `SessaoOut`: `token`, `expira_em`, `usuario`.
- Senha: `hashlib.scrypt` com `n=2**14`, `r=8`, `p=1`, salt de 16 bytes e `dklen=32`, guardada como `scrypt$n$r$p$salt$hash` em base64. Confira com `hmac.compare_digest`. No login com e-mail inexistente, confira contra um `HASH_FALSO`, para o tempo de resposta não revelar quais e-mails têm conta.
- Sessão: token `secrets.token_urlsafe(32)`; o banco guarda só o SHA-256. Validade em `settings.sessao_horas` (padrão 8). Ao criar uma sessão, apague as vencidas do mesmo usuário.
- `sessao_atual` lê `Authorization: Bearer` com `HTTPBearer(auto_error=False)` e responde 401 (`Sessão expirada ou inválida. Entre novamente.`, com `WWW-Authenticate: Bearer`) sem token, com token desconhecido ou vencido. `usuario_atual` depende dela.

Fluxo de `POST /api/previsoes`:

1. Exija login.
2. Arquivo acima do limite: 413, `Imagem maior que <n> MB.`, sem chamar a IA.
3. Envie `modelo_id` e a imagem à IA. Modelo inexistente (404) e imagem inválida (422) voltam com o status e a mensagem da IA; IA fora do ar dá 503.
4. Com `decidir`, calcule a classe e a `confianca`. Abaixo do limiar de inconclusivo, grave e devolva `classe_prevista = "inconclusivo"`, mantendo as probabilidades.
5. Grave só o resultado, com o `tempo_ms` informado pela IA. **A imagem não é guardada em nenhum dos serviços.**

Filtros de `/api/treinos`: omita o parâmetro quando não houver filtro. `normalizado` vazio não é um valor válido.

`aviso`, em toda resposta:

> Resultado de um modelo experimental, feito para fins acadêmicos. Não é um diagnóstico e não substitui a avaliação de um profissional de saúde.

Partida (`lifespan`): `create_all`, `atualizar_esquema`, importe o CSV se configurado e crie `app.state.ia = ClienteIA(...)`, fechado no fim. A API principal não carrega modelos.

## Como rodar

```sh
cd ia
set IA_TOKEN=token-local
uvicorn app.main:app --reload --port 8001
```

```sh
cd backend
.venv\Scripts\activate
set IA_TOKEN=token-local
uvicorn app.main:app --reload
```

## Testes: `backend/tests/`

Em `conftest.py`, crie uma fixture de sessão `app` que define `DATABASE_URL`, `IA_URL`, `IA_TOKEN`, `RESULTADOS_CSV` e `FRONTEND_DIR` em `os.environ`, usando `tmp_path_factory`, **antes** de importar `app.main`, porque a configuração é lida na importação. Depois, abra `TestClient(app)` com `with`. A fixture `cliente` cadastra um usuário e devolve um `TestClient` já com o cabeçalho `Authorization`. A fixture `ia_falsa` troca `app.state.ia` por um `ClienteIA` com `httpx.MockTransport`, que responde por caminho (`/modelos`, `/prever`) e guarda os pedidos. Em `test_api.py`, cubra:

- Saúde sem chamar a IA, importação do CSV, filtro de treinos e `separar_dataset`.
- `/api/modelos` com os limiares de decisão e o token enviado; IA fora do ar dá 503.
- `POST /api/previsoes`: `[0.95, 0.05]` dá a classe; `[0.55, 0.45]` dá `inconclusivo`; com limiar 0,18, 0,2 dá a segunda classe, sem inconclusivo, e `limiar_baixa_certeza` igual a 0,8. A imagem e o token chegam à IA, e a previsão aparece no histórico.
- Recusas da IA (404 e 422) repassadas; conexão recusada, tempo esgotado, 500 e 401 viram 503; arquivo grande demais dá 413 sem chamar a IA.
- `indice_previsto`, sem limiar e com limiar de 0,18.

Em `ia/tests/test_ia.py`, com os três modelos reais de `models/` e `IA_TOKEN` definido antes da importação: `/saude` pública, token ausente ou errado (401), lista de modelos, previsão real em cada modelo (probabilidades somam 1), modelo inexistente (404), imagem vazia ou inválida (422), formato e intervalo de `preprocessar` e `preprocessar_pil`, recusa de imagem pequena e a saída de `prever` com uma sessão ONNX falsa (logits passam pelo softmax; com limiar, `[1 - p, p]`).

Em `test_auth.py`: cadastro (e-mail limpo e em minúsculas, senha fora da resposta e guardada só como hash), e-mail repetido (409), dados inválidos (422), login certo e errado com a mesma mensagem, rotas protegidas sem token (401), `eu` e `sair` (o token deixa de valer), sessão vencida, histórico separado por usuário e a migração de `atualizar_esquema` num banco antigo sem `usuario_id`.
