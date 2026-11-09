---
name: pixoramed-backend
description: Crie a API do PixoraMed com FastAPI e ONNX Runtime, incluindo pré-processamento, inferência, regras de decisão e o contrato usado pelo front. Use ao criar ou alterar rotas, esquemas, configuração ou a lógica de previsão.
---

# Backend

Stack: FastAPI, ONNX Runtime na CPU, OpenCV, Pillow, SQLAlchemy 2, Pandas e pydantic-settings. Consulte `pixoramed-banco-dados` para as tabelas e `pixoramed-regras-do-produto` para as decisões.

`requirements.txt`: `fastapi>=0.115`, `uvicorn[standard]>=0.32`, `python-multipart>=0.0.12`, `pydantic-settings>=2.6`, `sqlalchemy>=2.0`, `psycopg[binary]>=3.2`, `pandas>=2.2`, `numpy>=2.0`, `opencv-python-headless>=4.10`, `pillow>=10.0`, `onnxruntime>=1.20`. O PyTorch **não** entra aqui.

## Configuração: `app/config.py`

`BaseSettings`, com `env_file=".env"` (a API roda de dentro de `backend/`, então o arquivo é `backend/.env`) e `extra="ignore"`. A raiz do projeto é `Path(__file__).resolve().parents[2]`:

| Variável | Padrão | Uso |
|---|---|---|
| `DATABASE_URL` | SQLite em `data/pixoramed.db` | Conexão |
| `MODELS_DIR` | `models/` na raiz | Modelos |
| `RESULTADOS_CSV` | `data/resultados.csv` | Treinos |
| `IMPORTAR_CSV_NO_INICIO` | `true` | Importação na partida |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:8080` | Origens, separadas por vírgula |
| `MAX_UPLOAD_MB` | `10` | Limite do arquivo |
| `LIMIAR_INCONCLUSIVO` | `0.8` | Inconclusivo e baixa certeza |
| `ONNX_THREADS` | `1` | Threads do ONNX Runtime |

## Inferência: `app/inferencia.py`

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

**Decisão:**

```python
def indice_previsto(modelo, probabilidades):
    if modelo.limiar is not None:
        return 1 if probabilidades[1] >= modelo.limiar else 0
    return int(probabilidades.argmax())

def limiar_inconclusivo_do_modelo(modelo):
    return None if modelo.limiar is not None else settings.limiar_inconclusivo

def limiar_baixa_certeza_do_modelo(modelo):
    return settings.limiar_inconclusivo if modelo.limiar is not None else None
```

## Contrato da API

Inclua os routers `auth`, `treinos`, `modelos` e `previsoes`. CORS só com `GET` e `POST` e os cabeçalhos `Authorization` e `Content-Type`. Documentação em `/docs`.

| Rota | Resposta |
|---|---|
| `POST /api/auth/cadastro` | 201 com `SessaoOut`; e-mail repetido dá 409 |
| `POST /api/auth/login` | `SessaoOut`; e-mail inexistente ou senha errada dão 401 com a mesma mensagem, `E-mail ou senha incorretos.` |
| `GET /api/auth/eu` | `UsuarioOut` (exige login) |
| `POST /api/auth/sair` | 204, apaga a sessão (exige login) |
| `GET /api/saude` | `{"status": "ok", "modelos": n}` |
| `GET /api/treinos?cancer=&modo=&normalizado=` | Lista de treinos, ordenada por `cancer`, `modo` e `data_hora` |
| `GET /api/treinos/canceres` | Lista de nomes |
| `GET /api/modelos` | Lista de modelos, ordenada por `cancer` e `modo` |
| `POST /api/previsoes` | Multipart, com `modelo_id` e `arquivo` (exige login; grava `usuario_id`) |
| `GET /api/previsoes?limite=20` | Histórico **do usuário logado**, mais recente primeiro, com `limite` entre 1 e 100 |

**`ModeloOut`:** `id`, `cancer`, `modo`, `tamanho`, `normalizado` (`escala != 1`), `classes`, `descricao`, `metricas`, `limiar`, `limiar_inconclusivo`, `limiar_baixa_certeza`.

**`PrevisaoOut`:** `id`, `modelo_id`, `cancer`, `classe_prevista`, `confianca`, `probabilidades` (lista de `classe` e `probabilidade`, em ordem decrescente), `limiar`, `limiar_inconclusivo`, `limiar_baixa_certeza`, `tempo_ms`, `aviso`.

**`PrevisaoHistorico`:** `id`, `criado_em`, `modelo_id`, `classe_prevista`, `confianca`, `tempo_ms`.

**`TreinoOut`:** todas as colunas da tabela `treinos`.

**Autenticação (`app/autenticacao.py`, `app/routers/auth.py`):** sem dependências novas, só a biblioteca padrão.

- `CadastroIn`: `nome` (2 a 80, espaços repetidos removidos), `email` (até 254, formato `algo@dominio.tld`) e `senha` (8 a 128). Limpe nome e e-mail com `field_validator(mode="before")`, antes de conferir tamanho e formato; o e-mail vai para minúsculas. `LoginIn`: `email` e `senha`. `UsuarioOut`: `id`, `nome`, `email`, `criado_em`. `SessaoOut`: `token`, `expira_em`, `usuario`.
- Senha: `hashlib.scrypt` com `n=2**14`, `r=8`, `p=1`, salt de 16 bytes e `dklen=32`, guardada como `scrypt$n$r$p$salt$hash` em base64. Confira com `hmac.compare_digest`. No login com e-mail inexistente, confira contra um `HASH_FALSO`, para o tempo de resposta não revelar quais e-mails têm conta.
- Sessão: token `secrets.token_urlsafe(32)`; o banco guarda só o SHA-256. Validade em `settings.sessao_horas` (padrão 8). Ao criar uma sessão, apague as vencidas do mesmo usuário.
- `sessao_atual` lê `Authorization: Bearer` com `HTTPBearer(auto_error=False)` e responde 401 (`Sessão expirada ou inválida. Entre novamente.`, com `WWW-Authenticate: Bearer`) sem token, com token desconhecido ou vencido. `usuario_atual` depende dela.

Fluxo de `POST /api/previsoes`:

1. Modelo inexistente: 404, `Modelo '<id>' não encontrado.`
2. Arquivo acima do limite: 413, `Imagem maior que <n> MB.`
3. `ImagemInvalida`: 422, com a mensagem do erro.
4. Calcule `confianca` como a probabilidade do índice previsto.
5. Se houver limiar de inconclusivo e a confiança estiver abaixo dele, grave e devolva `classe_prevista = "inconclusivo"`, mantendo as probabilidades.
6. Grave só o resultado. **A imagem é descartada.**

Filtros de `/api/treinos`: omita o parâmetro quando não houver filtro. `normalizado` vazio não é um valor válido.

`aviso`, em toda resposta:

> Resultado de um modelo experimental, feito para fins acadêmicos. Não é um diagnóstico e não substitui a avaliação de um profissional de saúde.

Partida (`lifespan`): `create_all`, importe o CSV se configurado, carregue os modelos em `app.state.registro` e registre as quantidades no log.

## Como rodar

```sh
cd backend
.venv\Scripts\activate
uvicorn app.main:app --reload
```

## Testes: `backend/tests/`

Em `conftest.py`, crie uma fixture de sessão `app` que define `DATABASE_URL`, `MODELS_DIR`, `RESULTADOS_CSV` e `FRONTEND_DIR` em `os.environ`, usando `tmp_path_factory`, **antes** de importar `app.main`, porque a configuração é lida na importação. Depois, abra `TestClient(app)` com `with`. A fixture `cliente` cadastra um usuário e devolve um `TestClient` já com o cabeçalho `Authorization`, usado pelos testes de `test_api.py`. A sessão falsa implementa `get_inputs()`, que devolve um objeto com `name`, e `run()`. Coloque-a em `app.state.registro.modelos["falso"]`. Cubra:

- Saúde, importação do CSV e filtro de treinos.
- Modelo inexistente (404), `separar_dataset` e arquivo vazio (422, nos dois pré-processamentos).
- Formato e intervalo de `preprocessar`, nos modos cor e cinza, e imagem inválida.
- `preprocessar_pil`: formato, normalização e recusa de imagem inválida ou pequena.
- `indice_previsto`, sem limiar e com limiar de 0,18.
- `POST /api/previsoes` com uma sessão ONNX falsa: logits `[3, 0]` dão classe; `[0.2, 0]` dão `inconclusivo`; com limiar, 0,2 dá a segunda classe, sem inconclusivo, e `limiar_baixa_certeza` igual a 0,8.

Em `test_auth.py`: cadastro (e-mail limpo e em minúsculas, senha fora da resposta e guardada só como hash), e-mail repetido (409), dados inválidos (422), login certo e errado com a mesma mensagem, rotas protegidas sem token (401), `eu` e `sair` (o token deixa de valer), sessão vencida, histórico separado por usuário e a migração de `atualizar_esquema` num banco antigo sem `usuario_id`.
