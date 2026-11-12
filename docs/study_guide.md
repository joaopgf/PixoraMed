# Guia de estudo — conceitos do PixoraMed

Nov 11, 2026 · Grupo PixoraMed (Bootcamp de IA II/2026, TCS e SENAI Londrina)

## Como usar o guia

Cada conceito segue o mesmo roteiro, que é a ordem em que a banca costuma perguntar:

1. **O que é**: a definição em uma ou duas frases.
2. **Como funciona**: o mecanismo, sem jargão a mais.
3. **Onde está no código**: arquivo e trecho real do sistema.
4. **Por que o sistema usa**: o problema que ele resolve aqui.
5. **Pergunta de banca**: uma pergunta provável e a resposta curta.

A dica para a banca é responder nessa mesma ordem: definição, mecanismo, exemplo do próprio código, motivo.

Os números deste guia são os medidos pelo grupo. Regra de ouro na banca: **não arredondar para cima e não chamar teste da mesma fonte de "teste externo"**. A seção [Resultados e honestidade](#resultados-e-honestidade) diz o que cada número mede e o que não mede.

## Visão geral em uma tela

**O que o sistema faz.** Classifica imagens de três tipos de câncer (Pele, Oral e Cérebro), mostra a classe prevista com a probabilidade de cada classe e guarda o histórico de cada usuário, com um resumo dos resultados. Também mostra os modelos e as limitações de cada um. As telas são pensadas para um médico: só o essencial, sem métricas técnicas de treino. É um protótipo acadêmico: não faz diagnóstico.

**Como a requisição anda.**

```
Navegador ──► frontend (React + Vite, Vercel)
                 │  /api/*  (rewrite do vercel.json)
                 ▼
              backend (Spring Boot, Render) ──SQL──► PostgreSQL (Neon)
                 │  HTTP + header X-Internal-Token
                 ▼
              ai-service (FastAPI + ONNX Runtime, Render)
```

| Serviço   | Faz                                                                                | Não faz                                            |
| ---------- | ---------------------------------------------------------------------------------- | --------------------------------------------------- |
| frontend   | Mostra as telas e chama `/api`                                                   | Regra de negócio, guardar segredo                  |
| backend    | Login (JWT), histórico, importação dos treinos, **decide a classe final** | Rodar o modelo                                      |
| ai-service | Pré-processa a imagem, roda o modelo, devolve probabilidades                      | Acessar o banco, guardar a imagem, decidir a classe |

**Pergunta de banca.** *Resuma a arquitetura em 30 segundos.* Resposta: "São três serviços. O React na Vercel só mostra as telas e chama `/api`. A Vercel repassa para o backend Spring Boot no Render, que cuida do login, do histórico e da regra de decisão, e grava no PostgreSQL do Neon. Para classificar a imagem, o backend chama o ai-service em Python, que roda os modelos ONNX e devolve só as probabilidades. A IA não tem banco e não guarda imagem."

## Estrutura do projeto

### Monorepo com uma pasta por serviço

**O que é.** Um único repositório Git com os três serviços e a infraestrutura, cada um na sua pasta, com Dockerfile, README, `.env.example` e documentação própria.

```
backend/      API Spring Boot (controller, service, repository, model, dto, security, exception)
frontend/     site React (api, auth, context, hooks, components, pages, utils, styles)
ai-service/   microsserviço de IA: app/, models/ (ONNX), scripts/ (exportação), tests/
infra/        docker-compose.yml (local) e terraform/ (nuvem)
docs/         BPMN, documento de entrega, glossário, guia para salvar modelos e este guia
```

**Por que o sistema usa.** O grupo é pequeno e as três partes mudam juntas: quando a IA passa a devolver um campo novo, o backend e a tela mudam no mesmo commit. Num repositório só, um `git log` conta a história inteira e a banca recebe um único link. Mesmo assim, os serviços são **independentes**: nenhum importa código do outro, cada um tem a sua imagem Docker e o seu deploy.

**Pergunta de banca.** *Por que não um repositório por serviço?* Resposta: "Com três serviços e quatro pessoas, separar só aumentaria o trabalho de manter versões alinhadas. A separação que importa existe: cada pasta tem build, Dockerfile e deploy próprios, e eles só se falam por HTTP."

### Por que a IA é um microsserviço separado

**O que é.** O código que roda os modelos fica num serviço próprio, em Python, chamado pelo backend.

**Por que o sistema usa.**

- **Linguagem certa para cada parte**: os modelos foram treinados em Python (PyTorch), e as bibliotecas de imagem (OpenCV, Pillow) e o ONNX Runtime são do mundo Python. O backend fica em Java, que é o padrão de mercado para API com login e banco.
- **Peso**: OpenCV e ONNX Runtime são quase toda a imagem do ai-service (~862 MB). O backend não carrega isso.
- **Isolamento**: a IA não tem acesso a nenhum dado de usuário. Recebe uma imagem, devolve números.
- **Troca de modelo sem mexer no resto**: um modelo novo é um par `.onnx` + `.json` na pasta `models/`.

**Pergunta de banca.** *Por que não rodar o modelo direto no Java?* Resposta: "Daria para rodar ONNX em Java, mas o pré-processamento precisa ser idêntico ao do treino, que foi feito em Python com OpenCV e PIL. Uma diferença de cor ou de redimensionamento derruba a acurácia. Manter a inferência em Python garante a mesma conta do notebook."

### Por que a regra de decisão fica no backend

**O que é.** A IA devolve só probabilidades. Quem decide se o resultado é "maligno", "benigno" ou "inconclusivo" é o `DecisionService` do backend.

**Por que o sistema usa.** Limiar é regra de negócio: muda mais do que o modelo e precisa de teste. No backend, ela é configurável por variável de ambiente (`INCONCLUSIVE_THRESHOLD`) e coberta pelo `DecisionServiceTest`. O frontend não decide nada, então ninguém muda a regra editando o JavaScript no navegador.

## Backend: Java e Spring Boot

### Camadas (Controller, Service, Repository, Model)

**O que é.** Cada camada tem uma responsabilidade:

| Camada     | Faz                                                                               | Não faz          |
| ---------- | --------------------------------------------------------------------------------- | ----------------- |
| Controller | Recebe o HTTP, valida o DTO (`@Valid`), devolve o status                        | Regra de negócio |
| Service    | Regras de negócio: login, decisão da classe, importação do CSV, chamada à IA | Conhecer HTTP     |
| Repository | Acesso ao banco (Spring Data JPA)                                                 | Decidir regra     |
| Model      | Entidades JPA (`User`, `Training`, `Prediction`): cada classe com `@Entity` vira uma tabela (`users`, `trainings`, `predictions`) e cada campo vira uma coluna | Sair direto na resposta da API (quem sai é o DTO) |

Além delas: `dto` (entrada e saída da API), `security` (JWT, BCrypt, CORS) e `exception` (erros padronizados).

**Como as camadas se encaixam numa análise:** o `PredictionController` recebe o `POST`, o `PredictionService` chama a IA e decide a classe, cria um objeto `Prediction` (o **model**) com o resultado, e o `PredictionRepository` grava esse objeto na tabela `predictions`. Na volta, o service converte o model num DTO (`PredictionResponse`), que é o que o navegador recebe.

**Onde está no código.** `PredictionController` só lê o usuário do token e repassa:

```java
public PredictionResponse predict(@AuthenticationPrincipal Jwt jwt, ...) {
    return predictionService.predict(Long.valueOf(jwt.getSubject()), modelId, file);
}
```

**Por que o sistema usa.** Uma regra fica num só lugar. A regra "cada usuário vê só as próprias análises" está no `PredictionService.history`, e nenhum controller precisa repeti-la.

### Métodos HTTP e as rotas do sistema

**O que é.** Toda requisição HTTP tem um **método** (também chamado de verbo), que diz o que o cliente quer fazer com o recurso da URL. Os principais:

| Método | Para quê | Seguro? (não altera nada) | Idempotente? (repetir dá o mesmo efeito) |
| --- | --- | --- | --- |
| `GET` | Ler um recurso | Sim | Sim |
| `POST` | Criar algo ou enviar dados para processar | Não | Não |
| `PUT` | Substituir um recurso inteiro | Não | Sim |
| `PATCH` | Alterar parte de um recurso | Não | Não necessariamente |
| `DELETE` | Apagar um recurso | Não | Sim |
| `OPTIONS` | Perguntar o que o servidor aceita (o navegador usa no *preflight* do CORS) | Sim | Sim |

**Como funciona.** O método vem na primeira linha da requisição, junto com a URL (`POST /api/predictions HTTP/1.1`). No Spring, cada método do controller é ligado a um verbo por uma anotação: `@GetMapping`, `@PostMapping` (e existem `@PutMapping`, `@PatchMapping` e `@DeleteMapping`). No FastAPI, pelo decorador: `@app.get`, `@app.post`. A resposta volta com um **código de status**: `200` (ok), `201` (criado), `401` (sem login válido), `404` (não encontrado), `409` (conflito), `413` (arquivo grande), `422` (dados inválidos), `503` (serviço indisponível).

**Onde está no código.** O PixoraMed usa **só `GET` e `POST`**:

| Método | Rota | Login? | O que faz | Onde |
| --- | --- | --- | --- | --- |
| `POST` | `/api/auth/register` | não | Cria a conta; responde **201** (ou 409 se o e-mail já existe) | `AuthController` |
| `POST` | `/api/auth/login` | não | Confere e-mail e senha e devolve o token JWT | `AuthController` |
| `GET` | `/api/health` | não | Diz se a API está no ar (usado pelo Render) | `TrainingController` |
| `GET` | `/api/trainings` | não | Lista os treinos importados do CSV | `TrainingController` |
| `GET` | `/api/models` | não | Lista os modelos da IA, com os limiares | `PredictionController` |
| `POST` | `/api/predictions` | sim | Envia a imagem (multipart) e recebe a classe e as probabilidades | `PredictionController` |
| `GET` | `/api/predictions?limit=100` | sim | Histórico do usuário logado | `PredictionController` |

Entre o backend e o ai-service, o padrão é o mesmo:

| Método | Rota | Token interno? | O que faz |
| --- | --- | --- | --- |
| `GET` | `/health` | não | Diz se a IA está no ar e quantos modelos carregou |
| `GET` | `/models` | sim | Lista os modelos carregados |
| `POST` | `/predict` | sim | Recebe a imagem e devolve as probabilidades |

```java
// AuthController: o cadastro cria um recurso, então responde 201 em vez de 200
@PostMapping("/register")
@ResponseStatus(HttpStatus.CREATED)
public AuthResponse register(@Valid @RequestBody RegisterRequest request) { ... }
```

O CORS do backend também libera só esses dois métodos: `config.setAllowedMethods(List.of("GET", "POST"))`. O `OPTIONS` do *preflight* o próprio Spring responde.

**Por que o sistema usa só esses dois.**

- **`GET` para tudo que só lê** (saúde, modelos, treinos, histórico): não altera nada, pode ser repetido sem efeito colateral e pode ser guardado em cache pelo navegador ou pelo TanStack Query.
- **`POST` para o que cria ou processa**: o cadastro cria um usuário, o login cria um token e a análise cria um registro no histórico. Mandar a mesma imagem duas vezes gera duas análises, então não é idempotente, e é exatamente o caso do `POST`.
- **Sem `PUT`, `PATCH` e `DELETE`** porque o sistema não tem nada para editar nem apagar: o histórico é um registro do que foi feito, a conta não tem tela de edição e o logout não precisa de rota (o site só apaga o token, porque o JWT não fica no banco). Criar rotas sem uso só aumentaria o que precisa ser protegido.

**Pergunta de banca.** *Por que o login é `POST` e não `GET`, se ele "busca" o usuário?* Resposta: "No `GET`, os dados vão na URL, e a URL fica no histórico do navegador e nos logs dos servidores. A senha nunca pode ir na URL. No `POST`, ela vai no corpo da requisição, protegido pelo HTTPS. Além disso, o login cria algo novo: o token."

**Pergunta de banca.** *Qual a diferença entre `PUT` e `PATCH`?* Resposta: "O `PUT` substitui o recurso inteiro; o `PATCH` altera só os campos enviados. O PixoraMed não usa nenhum dos dois, porque não tem edição de dados. Se um dia tiver a tela 'editar meu nome', o certo seria um `PATCH /api/users/me`."

**Pergunta de banca.** *O que é idempotente?* Resposta: "Repetir a requisição várias vezes deixa o servidor no mesmo estado que uma vez só. O `GET` do histórico é idempotente; o `POST` da análise não, porque cada envio grava uma análise nova."

### DTO e record

**O que é.** DTO (*Data Transfer Object*) é o objeto que entra ou sai da API, separado da entidade do banco. No PixoraMed os DTOs são `record`: classes imutáveis só de dados, em que o Java gera construtor, getters, `equals` e `toString`.

**Onde está no código.** A pasta `dto`: `RegisterRequest`, `LoginRequest`, `AuthResponse`, `PredictionResponse`, `UserResponse`... O `UserResponse.from(user)` monta a resposta a partir da entidade.

**Por que o sistema usa.** A entidade `User` tem o hash da senha; o `UserResponse` não tem. A entidade nunca sai direto na resposta. Os DTOs `AiModel` e `AiPrediction` também traduzem o JSON da IA, que vem em `snake_case` (`model_id`), para o padrão Java (`modelId`) com `@JsonAlias`.

**Pergunta de banca.** *Por que não devolver a entidade direto?* Resposta: "Ela tem campos que não podem sair, como o hash da senha, e acoplaria a API à estrutura do banco. O DTO define exatamente o contrato."

### Stream, lambda e Optional

**O que é.** *Stream* processa uma coleção em etapas encadeadas (`filter`, `map`, `sorted`) e só executa na operação terminal (`toList`, `collect`). *Lambda* é uma função sem nome (`m -> m.id()`), e *method reference* é o atalho para uma lambda que só chama um método (`AiModel::cancerType`). *Optional* é uma caixa que pode estar vazia, no lugar do `null`.

**Onde está no código.**

```java
// PredictionService.listModels: ordena os modelos da IA e converte para o DTO da API
return aiService.listModels().stream()
        .sorted(Comparator.comparing(AiModel::cancerType).thenComparing(AiModel::mode))
        .map(m -> new ModelResponse(m.id(), m.cancerType(), ...))
        .toList();

// TrainingService.importCsv: chaves dos treinos que já estão no banco
Set<String> existing = trainings.findAll().stream()
        .map(t -> t.getRunAt() + "|" + t.getDataset())
        .collect(Collectors.toSet());

// AuthService.login: o repositório devolve Optional<User>
User user = users.findByEmail(email).orElse(null);
```

**Por que o sistema usa.** Cada regra vira uma linha que diz *o que* se quer, sem índice nem variável auxiliar. O Optional obriga a tratar "não encontrei" no ponto da busca, e no login esse caso vira 401 com a mensagem genérica.

**Pergunta de banca.** *Por que Stream e não for?* Resposta: "O resultado é o mesmo. O Stream deixa a intenção explícita, não altera a lista original e evita variáveis de controle. No `DecisionService` mantive um `for`, porque ali preciso do índice da maior probabilidade."

### Tratamento global de erros

**O que é.** O `GlobalExceptionHandler`, com `@RestControllerAdvice`, converte cada exceção numa resposta JSON `{"message": "..."}` com o status certo.

| Exceção                                  | Status                                                     |
| ------------------------------------------ | ---------------------------------------------------------- |
| `ApiException` (lançada pelos services) | o status que ela carrega: 401, 404, 409, 413, 422, 503     |
| Erro de `@Valid` no DTO                  | 400, com a mensagem do primeiro campo inválido            |
| Imagem maior que 10 MB                     | 413                                                        |
| Qualquer outra                             | 500 "Erro interno", e o rastro da pilha vai só para o log |

**Por que o sistema usa.** Nenhum controller tem `try/catch`, e o frontend sempre recebe o mesmo formato de erro para mostrar ao usuário. Detalhe interno nunca sai na resposta.

## Backend: banco e dados

### JPA, Hibernate e as três tabelas

**O que é.** JPA é a especificação Java de mapeamento objeto-relacional (ORM); Hibernate é a implementação; Spring Data JPA gera os repositórios a partir do nome do método.

**Como funciona.** A classe `Prediction` com `@Entity` vira a tabela `predictions`. O método `findByUserIdOrderByCreatedAtDesc(userId, pageable)` vira `SELECT ... WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`, sem SQL escrito à mão.

| Tabela          | Conteúdo                                                                      |
| --------------- | ------------------------------------------------------------------------------ |
| `users`       | nome, e-mail (único) e hash BCrypt da senha                                   |
| `trainings`   | uma linha por treino do `training-results.csv`                               |
| `predictions` | usuário, modelo, classe, confiança, probabilidade de cada classe (JSON), tempo e horário. **Sem a imagem** |

A tabela `predictions` tem índice em `userId`, que é a busca do histórico.

**Por que sem Flyway.** O `ddl-auto=update` deixa o Hibernate criar e atualizar as tabelas sozinho. Foi uma escolha de simplicidade do grupo: três tabelas, sem histórico de migrations para manter. Em um sistema com dados reais de produção, o caminho seria Flyway, para versionar cada mudança do banco.

**Pergunta de banca.** *Onde está o SQL do projeto?* Resposta: "O banco é PostgreSQL. As consultas são geradas pelo Spring Data JPA a partir dos métodos do repositório, como o histórico ordenado por data com limite de 100. As tabelas podem ser consultadas direto com SQL pelo pgAdmin, no banco local do Docker, na porta definida no `infra/.env`."

### Como os treinos entram no banco (Python, Pandas e o CSV)

**O que é.** Os notebooks de treino geram uma tabela de resultados (`training-results.csv`, 29 execuções). O backend importa essa tabela para a tabela `trainings` toda vez que sobe.

**Como funciona.**

1. Nos notebooks (repositório Projeto-ML-Cancer), Python treina e avalia com validação cruzada e grava uma linha por execução no CSV (separador `;` e vírgula decimal). O Pandas lê os metadados do HAM10000 no notebook da Pele.
2. O CSV vai para `backend/src/main/resources/data/` e entra no `.jar`.
3. No evento `ApplicationReadyEvent`, o `TrainingService.importOnStartup` lê o CSV, traduz os nomes ("Pele" → `skin`, "cinza" → `gray`) e insere **só as linhas novas**, comparando pela chave data/hora + dataset.

**Por que o sistema usa.** A importação é idempotente: pode rodar quantas vezes quiser sem duplicar. Atualizar os treinos é trocar o CSV e fazer deploy.

**Pergunta de banca.** *Onde o Pandas entra no projeto?* Resposta: "Na preparação dos dados e na análise dos treinos, nos notebooks. O sistema em produção não precisa do Pandas: ele só lê o CSV que os notebooks geraram."

## Backend: segurança

### Caminho de uma requisição autenticada

Antes de chegar ao Controller, toda requisição passa pela cadeia de filtros do Spring Security:

1. **CORS**: confere se a origem está em `CORS_ALLOWED_ORIGINS`.
2. **Regras de URL**: cadastro, login, `/health`, `/trainings` e `/models` são públicos; o resto exige token.
3. **Validação do JWT** (`oauth2ResourceServer().jwt()`): confere assinatura e validade do header `Authorization: Bearer`.
4. **Controller**: lê o id do usuário com `@AuthenticationPrincipal Jwt`.

```java
.authorizeHttpRequests(auth -> auth
        .requestMatchers(HttpMethod.POST, "/api/auth/register", "/api/auth/login").permitAll()
        .requestMatchers(HttpMethod.GET, "/api/health", "/api/trainings", "/api/models").permitAll()
        .anyRequest().authenticated())
.oauth2ResourceServer(oauth -> oauth.jwt(Customizer.withDefaults()));
```

### JWT (stateless)

**O que é.** JSON Web Token: um texto em três partes (cabeçalho, conteúdo, assinatura) assinado com o `JWT_SECRET`. Mudar qualquer letra do conteúdo invalida a assinatura.

**Como funciona.** No login, o `TokenService` gera um token HS256 com o id do usuário no `subject` e validade de 8 horas (`JWT_EXPIRATION_HOURS`). Em cada requisição o Spring confere a assinatura. *Stateless*: o servidor não guarda sessão; a prova de identidade vem no próprio token (`SessionCreationPolicy.STATELESS`).

```java
JwtClaimsSet claims = JwtClaimsSet.builder()
        .subject(user.getId().toString())
        .issuedAt(now)
        .expiresAt(expiresAt)
        .build();
```

O backend **não sobe** se o `JWT_SECRET` tiver menos de 32 caracteres, porque o HS256 exige chave de 256 bits.

**Por que o sistema usa.** O Render gratuito dorme e reinicia; como não há sessão na memória, ninguém perde o login quando o backend acorda.

**Pergunta de banca.** *Como funciona o logout se o token não fica no banco?* Resposta: "O site apaga o token do navegador. O token em si continua válido até vencer, em no máximo 8 horas. Revogar tokens antes do vencimento ficou como trabalho futuro."

### Onde o token fica no navegador

**Como funciona.** O `AuthContext` guarda a sessão no `sessionStorage`, que some ao fechar a aba. Com "Manter conectado", guarda no `localStorage`. O `apiClient` coloca o token no header `Authorization` de toda chamada, e uma resposta 401 faz logout com o aviso de sessão vencida.

**Pergunta de banca.** *Token no localStorage não é inseguro?* Resposta: "É a troca conhecida: um script malicioso na página (XSS) conseguiria ler o token. Reduzimos o risco porque o React escapa todo texto exibido e o token vence em 8 horas. A evolução seria um cookie `HttpOnly`, que o JavaScript não lê, como fizemos em outro projeto."

### BCrypt e a mensagem genérica de login

**O que é.** BCrypt é uma função de hash para senhas, com *salt* próprio por senha e cálculo lento de propósito.

**Onde está no código.** `SecurityConfig.passwordEncoder()` e `AuthService`. O cadastro grava `passwordEncoder.encode(senha)`; o login compara com `passwordEncoder.matches`.

**Por que o sistema usa.** Se o banco vazar, as senhas não aparecem, e o cálculo lento encarece tentar milhões de senhas. E-mail inexistente e senha errada recebem **a mesma resposta** ("E-mail ou senha incorretos."), para ninguém descobrir quem tem conta.

### Token interno entre backend e IA (X-Internal-Token)

**O que é.** Um segredo compartilhado (`AI_SERVICE_TOKEN`) que o backend envia em todo pedido à IA.

**Como funciona.** O ai-service compara o header com o token configurado usando `hmac.compare_digest`, que leva o mesmo tempo acertando ou errando:

```python
def require_token(x_internal_token: str = Header(default="")) -> None:
    if not hmac.compare_digest(x_internal_token.encode(), settings.ai_service_token.encode()):
        raise HTTPException(status_code=401, detail="Token do serviço de IA ausente ou inválido.")
```

Só o `/health` é público, porque o Render precisa dele para saber se o serviço está no ar. O token é obrigatório: sem ele, o ai-service não sobe.

**Por que o sistema usa.** No Render, a URL da IA é pública. Sem o token, qualquer pessoa usaria o modelo de graça, consumindo a CPU do plano gratuito.

**Pergunta de banca.** *Por que `compare_digest` e não `==`?* Resposta: "O `==` para no primeiro caractere diferente, e o tempo de resposta revelaria quantos caracteres estão certos. O `compare_digest` leva sempre o mesmo tempo."

### CORS e CSRF

**CORS.** Regra do navegador: um site só lê a resposta de outra origem se ela permitir. O backend libera só a origem do `CORS_ALLOWED_ORIGINS`, com os métodos GET e POST e os headers `Authorization` e `Content-Type`. Em produção o rewrite da Vercel deixa site e API no mesmo domínio.

**CSRF desligado.** O ataque CSRF depende de o navegador enviar a credencial sozinho, como faz com cookies. No PixoraMed o token vai no header `Authorization`, que o navegador nunca envia sozinho, então a proteção CSRF do Spring não tem o que proteger.

## Backend: configuração e operação

### Variáveis de ambiente e os arquivos .env

**O que é.** Tudo que muda entre máquinas (senha do banco, `JWT_SECRET`, token da IA, endereço do site) fica fora do código. O `application.properties` só referencia: `spring.datasource.url=${DATABASE_URL}`. Variável obrigatória que faltar impede o backend de subir.

**São três ambientes, e cada um lê os próprios arquivos:**

| Ambiente         | Como sobe                              | De onde vêm as variáveis                               |
| ---------------- | -------------------------------------- | -------------------------------------------------------- |
| Local com Docker | `docker compose up` em `infra/`    | só do `infra/.env`                                    |
| Local sem Docker | IntelliJ, `uvicorn`, `npm run dev` | `backend/.env`, `ai-service/.env`, `frontend/.env` |
| Produção       | Terraform cria; Render e Vercel rodam  | env groups do Render, preenchidos pelo Terraform         |

- **`infra/.env`**: o compose lê e distribui para cada container. A `POSTGRES_PASSWORD` vira o `DATABASE_PASSWORD` do backend, e o mesmo `AI_SERVICE_TOKEN` vai para backend e IA.
- **`.env` de cada serviço**: só para rodar fora do Docker. O backend lê com `spring.config.import`, procurando `.env` (rodando dentro de `backend/`) e `backend/.env` (rodando da raiz, como no IntelliJ).
- **`terraform.tfvars`**: não chega a nenhum serviço. Guarda as **chaves de API** do Neon, do Render e da Vercel, para o Terraform criar os recursos.
- **`.env.example`**: o modelo versionado de cada `.env`, com os nomes das variáveis e valores de exemplo. O `.env` real, o `terraform.tfvars` e o `terraform.tfstate` ficam fora do git (`.gitignore`) e fora das imagens Docker (`.dockerignore`).

**Por que o sistema usa.** Segredo no código vaza junto com o repositório. E o mesmo código roda nos três ambientes sem edição: só a configuração muda.

**Pergunta de banca.** *Se eu clonar o repositório, consigo rodar?* Resposta: "Sim: copia `infra/.env.example` para `infra/.env`, troca as senhas e roda `docker compose up --build`. Nenhum segredo nosso está no repositório."

**Pergunta de banca.** *O Docker usa o terraform.tfvars?* Resposta: "Não. O Docker local usa só o `infra/.env`. O `terraform.tfvars` tem as chaves dos provedores de nuvem e só é lido pelo Terraform."

### Log

**O que é.** O registro do que a aplicação fez, com data, nível e mensagem. O backend usa o SLF4J com o Logback, padrão do Spring Boot; o ai-service usa o `logging` do Python.

**Como funciona.** Cada mensagem tem um nível: `INFO` (fluxo normal), `WARN` (algo estranho que o sistema contornou) e `ERROR` (falha). O log vai para o **console**, sem arquivo:

| Onde roda  | Onde ver o log                                                                 |
| ---------- | ------------------------------------------------------------------------------ |
| Docker     | `docker compose logs -f backend`, ou Docker Desktop → container → aba Logs |
| IntelliJ   | janela Run                                                                     |
| Produção | painel do Render → serviço → aba Logs                                       |

**Onde está no código.** Eventos que o backend registra:

```
INFO  AuthService       : Usuário 4 cadastrado
WARN  AuthService       : Login recusado: senha incorreta para o usuário 4
WARN  AuthService       : Login recusado: e-mail não cadastrado
INFO  PredictionService : Análise 17 concluída: usuário 5, modelo skin_color, classe malignant, confiança 0.7947, IA em 147 ms
WARN  PredictionService : Análise não concluída: usuário 4, modelo oral_color, status 422
WARN  AiServiceClient   : IA sem resposta: ...
ERROR GlobalExceptionHandler : Erro inesperado (com o rastro da pilha)
INFO  TrainingService   : training-results.csv: 0 treinos novos importados
```

**Por que o sistema usa e por que assim.**

- É o único jeito de saber o que aconteceu em produção, e na demo mostra em segundos onde uma análise parou.
- **Minimização de dados (LGPD)**: o usuário aparece só pelo id. E-mail, senha, token e imagem nunca vão para o log.
- **Sem arquivo**: no Docker, um arquivo dentro do container sumiria a cada rebuild; no Render, o disco é descartável e o painel já guarda o console.
- **Linhas falsas**: o `modelId` vem do navegador; antes de ir ao log, tudo que não for letra, número ou `_` vira `?`. Assim ninguém consegue forjar uma linha de log com uma quebra de linha.

**Pergunta de banca.** *Por que o log diferencia "e-mail não cadastrado" de "senha incorreta", se a resposta é a mesma?* Resposta: "A resposta para o usuário é a mesma, para não revelar quem tem conta. O log é interno: separar os casos ajuda a perceber várias tentativas contra a mesma conta, que é o primeiro passo para um limite de tentativas."

### Cliente da IA: timeout e erros

**Como funciona.** O `AiServiceClient` usa o `RestClient` do Spring com timeout de 120 s, guarda a lista de modelos em cache por 5 minutos e traduz as falhas:

- **404, 413, 422** (modelo inexistente, imagem grande, imagem ilegível): a mensagem da IA volta para a tela.
- **Qualquer outra falha**: vira 503 "O serviço de IA está indisponível no momento".

**Por que 120 s.** No Render gratuito, a IA dorme depois de 15 minutos sem uso, e acordar leva perto de 1 minuto. Na banca, abrir o site uns 5 minutos antes e fazer uma análise acorda os dois serviços.

## Frontend: React

### Componentes e páginas

**O que é.** A tela é montada com componentes: funções que recebem dados (*props*) e devolvem JSX.

**Onde está no código.** `pages/` tem as telas (`Dashboard`, `NewAnalysis`, `PrepareExam`, `Review`, `Result`, `History`, `Limitations`...). `components/` tem as peças reaproveitadas (`Panel`, `InfoPair`, `ImageDropzone`, `QueryState`, `ProbabilityPieChart`, `HistorySummary`, `LowConfidenceTag`).

**Por que não há página de resultados dos treinos.** Ela existia, com gráficos de acurácia, F1 e desvio entre folds. Foi removida porque o usuário do sistema é um médico, que precisa analisar uma imagem e acompanhar os próprios resultados, não comparar execuções de treino. Os números dos treinos continuam no banco, no documento de entrega e neste guia. Pelo mesmo motivo saiu a página **Módulos e modelos**, que mostrava os modelos carregados, os limiares, a acurácia e um checklist de integração: o que o médico precisa (o que cada módulo analisa, os avisos e as limitações) já aparece na Nova análise, no Resultado e em Limitações e ética.

**Por que o sistema usa.** Os 19 blocos de painel repetidos viraram um `Panel`, e as 14 duplas rótulo/valor viraram `InfoPair`. Componente de gráfico só recebe props, sem chamar a API: fica fácil de testar e reaproveitar.

### Fluxo de dados: página → hook → api → apiClient

**Como funciona.**

1. A página chama um hook (`useModels`, `usePredictionHistory`).
2. O hook usa o **TanStack Query**, que guarda o resultado em cache e controla "carregando" e "erro".
3. O hook chama uma função de `api/` (`predictionsApi`, `trainingsApi`, `authApi`).
4. Toda chamada passa pelo `apiClient.request`, o único lugar com `fetch`.

```js
export async function request(path, options = {}) {
  const headers = new Headers(options.headers);
  if (currentToken) headers.set("Authorization", `Bearer ${currentToken}`);
  const response = await fetch(path, { ...options, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    if (response.status === 401 && currentToken) onUnauthorized?.();
    throw new Error(body?.message ?? `Erro ${response.status} ao acessar a API`);
  }
  return response.json();
}
```

**Por que o sistema usa.** Token, erro e sessão vencida são tratados num só lugar. As páginas não sabem que existe HTTP.

### Context: login e análise em andamento

**O que é.** Um jeito de disponibilizar um dado para toda a aplicação sem passá-lo de componente em componente.

**Onde está no código.** O `AuthContext` guarda a sessão e oferece `useAuth()`. O `AnalysisContext` guarda a análise em andamento entre as telas Preparar exame → Revisão → Resultado (módulo, imagem, prévia e último resultado).

**Detalhe técnico que a banca pode perguntar.** A prévia da imagem usa `URL.createObjectURL`. Ela é criada uma vez por imagem e liberada no *cleanup* de um `useEffect`, nunca dentro do `setState`: o StrictMode do React roda as funções de atualização duas vezes, e isso criava dois endereços por imagem.

### Rotas protegidas e carregamento sob demanda

**Como funciona.** O React Router troca a tela pela URL sem recarregar a página (SPA). O `ProtectedRoute` mostra as telas internas só para quem está logado; os outros vão para `/login`. As telas internas são carregadas com `React.lazy`, só quando abertas.

**Por que o sistema usa.** O pacote principal caiu de 774 KB para 320 KB (gzip 228 → 103 KB). O Recharts, que é pesado, só baixa na tela de Resultado, onde fica o gráfico.

**Pergunta de banca.** *Esconder a rota no front é segurança?* Resposta: "Não, é experiência de uso. A segurança está no backend: análise e histórico exigem token no Spring Security. Chamar a API direto sem token dá 401."

### Gráfico de probabilidades e cores

**Como funciona.** O `ProbabilityPieChart` é um gráfico de rosca (Recharts) com a probabilidade de cada classe, a classe prevista no centro e uma legenda em texto com as porcentagens.

- **Classes malignas em vermelho** (pedido do professor): `MALIGNANT_CLASSES` em `utils/modules.js` lista `malignant` (Pele) e `scc` (Oral). O Cérebro não tem vermelho, porque o módulo não diz se o tumor é benigno ou maligno.
- **Nomes por extenso**: os ids das classes vêm do dataset (`scc`, `menin`, `tumor`), e a tela mostra o nome em português, conferido na descrição do Multi Cancer no Kaggle: `scc` = *Oral Squamous Cell Carcinoma* → **carcinoma espinocelular**; `menin` = *Meningioma* → **meningioma**; `tumor` = *Pituitary Tumor* → **hipofisário**. O id continua igual no modelo, na API e no banco; só a tela traduz (`className` em `utils/modules.js`).

### Cards de resumo no Histórico

**Como funciona.** Acima da tabela, o `HistorySummary` mostra quatro números das análises do usuário (até as 100 mais recentes): total, **suspeita de câncer** (maligno na Pele ou carcinoma espinocelular na Oral, com destaque vermelho), inconclusivas e baixa certeza. A conta fica em `summarizeHistory`, no `utils/resultView.js`; o componente só recebe os registros por props.

**Por que o sistema usa.** É o que o médico quer ver ao abrir o histórico: quantos casos pedem atenção, sem precisar ler a tabela inteira. O painel inicial, ao contrário, perdeu os contadores técnicos (modelos conectados, treinos registrados), que não ajudavam nesse uso.
- **A cor segue a classe, não a posição**: "benigno" é sempre azul, em qualquer análise. O gráfico recebe as classes do modelo, na ordem do treino, e é essa ordem que define as cores.
- **Também nas análises antigas**: o backend grava a probabilidade de cada classe na coluna `probabilities` da tabela `predictions`, como texto JSON (`{"normal": 0.0, "scc": 1.0}`). Quem faz a conversão é o `ProbabilitiesConverter`, um `AttributeConverter` do JPA, e o `GET /api/predictions` devolve essa lista. Assim o histórico mostra o mesmo gráfico do momento da análise, sem guardar a imagem. Análises feitas antes dessa coluna existir mostram um aviso no lugar do gráfico.
- **Acessibilidade**: a paleta passou num validador de daltonismo, e a identidade nunca depende só da cor (legenda com nome e porcentagem, descrição completa para leitor de tela).

### Vite, proxy e rewrite da Vercel

**Como funciona.** O site chama sempre `/api` no próprio endereço:

- **Desenvolvimento**: o Vite repassa `/api` para `BACKEND_URL` (`http://localhost:8080` ou `http://backend:8080` no Docker).
- **Produção**: o `vercel.json` repassa `/api/*` para o backend no Render e devolve o `index.html` para qualquer outra URL, para o React Router abrir a tela certa ao recarregar.

```json
{ "source": "/api/:path*", "destination": "https://pixoramed.onrender.com/api/:path*" },
{ "source": "/(.*)", "destination": "/index.html" }
```

**Por que o sistema usa.** O frontend não tem nenhum endereço nem segredo no código. O cache do rewrite está desligado em `/api` para nunca servir uma resposta de outro usuário.

## IA: os modelos

### Duas abordagens: CNN do zero e modelo pré-treinado

O grupo quis ter as duas experiências de deep learning, e cada uma ficou num módulo:

|                  | CNN do zero (Oral e Cérebro)                                               | Modelo pré-treinado (Pele)                                                                    |
| ---------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| O que é         | Rede pequena criada e treinada pelo grupo, com pesos aleatórios no início | EfficientNet-B0, uma rede já treinada no ImageNet, ajustada para pele (*transfer learning*) |
| Tamanho          | ~24 mil parâmetros, ~110 KB                                                | Ensemble de 5 redes, ~80 MB                                                                    |
| Entrada          | 128×128 (cor na Oral, cinza no Cérebro), pixels / 255                     | 224×224, cor, normalização ImageNet                                                         |
| Saída           | Softmax entre as classes                                                    | Probabilidade de maligno, calibrada                                                            |
| Decisão         | Classe mais provável; "inconclusivo" abaixo de 80%                         | Maligno a partir de 18%; aviso de baixa certeza abaixo de 80%                                  |
| Tempo por imagem | 0,1 s (Cérebro) e 0,2 s (Oral)                                             | 1,7 s                                                                                          |

### CNN (rede neural convolucional)

**O que é.** Uma rede que aprende filtros sobre a imagem: as primeiras camadas detectam bordas e texturas, as seguintes combinam esses padrões em formas.

**Como funciona a do projeto.** Três blocos Conv → ReLU → MaxPool (16, 32 e 64 filtros), um *pooling* adaptativo que resume cada filtro num número, Dropout de 25% e uma camada linear com uma saída por classe.

```python
Conv2d(channels, 16, kernel_size=3, padding=1), ReLU(), MaxPool2d(kernel_size=2),
Conv2d(16, 32, kernel_size=3, padding=1),       ReLU(), MaxPool2d(kernel_size=2),
Conv2d(32, 64, kernel_size=3, padding=1),       ReLU(), MaxPool2d(kernel_size=2),
AdaptiveAvgPool2d(1), Flatten(), Dropout(p=0.25), Linear(64, num_classes),
```

- **Conv2d**: desliza filtros 3×3 sobre a imagem e gera mapas de características.
- **ReLU**: zera os valores negativos; é o que deixa a rede aprender relações não lineares.
- **MaxPool**: reduz a imagem pela metade, ficando com o valor mais forte de cada região.
- **Dropout**: desliga 25% dos neurônios a cada passo do treino, para a rede não decorar.

**Treino.** PyTorch, otimizador Adam (taxa 0,001), lote de 64, perda *CrossEntropyLoss*, validação cruzada estratificada em 5 folds e semente 42.

**Por que uma rede tão pequena.** Nesses datasets ela já passou de 95% na mesma fonte, e roda numa fração de CPU do Render gratuito. Rede maior seria mais lenta e mais cara sem ganho medido.

**Pergunta de banca.** *O que é um fold e por que 5?* Resposta: "A validação cruzada divide os dados em 5 partes. Treina em 4 e testa na que sobrou, cinco vezes, trocando a parte de teste. A média e o desvio dos 5 resultados dizem quanto o número varia. Estratificada quer dizer que cada parte tem a mesma proporção de classes."

### Transfer learning e o ensemble da Pele

**O que é.** *Transfer learning* é partir de uma rede já treinada em milhões de imagens (o ImageNet) e ajustá-la para o problema novo. As primeiras camadas já sabem reconhecer bordas e texturas; o treino ensina o que importa em lesões de pele.

**Como funciona o modelo do app.**

1. **EfficientNet-B0**: arquitetura eficiente, com bom resultado e poucos parâmetros.
2. **Ensemble de 5**: cinco redes EfficientNet-B0 treinadas separadamente; a resposta é a média das cinco.
3. **Calibração de Platt**: a saída de cada rede passa por `sigmoid(a · logit + b)`, com `a` e `b` próprios de cada rede, para que "70%" signifique de fato cerca de 70% de chance.
4. **Limiar de 18%**: a imagem vira "maligno" quando a probabilidade calibrada passa de 18%, mesmo abaixo de 50%.

```python
# scripts/export_skin_ensemble.py: as 5 redes, a calibração e a média viram um único ONNX
logits = torch.cat([network(x).reshape(-1) for network in self.networks])
return torch.sigmoid(self.slopes * logits + self.intercepts).mean().reshape(1)
```

**Por que o limiar é tão baixo.** Numa triagem, deixar passar um câncer é pior do que um alarme falso. O limiar de 18% aumenta a sensibilidade (achar os malignos) e aceita mais alarmes falsos. Por isso a tela mostra "caso suspeito pelo limiar de 18%, não uma confirmação".

**Atenção à origem.** O código de treino original desse ensemble foi perdido (o computador do colega que treinou desligou). O app usa os pesos salvos, convertidos para ONNX. Para medir o método, o grupo **reproduziu** o treino no Colab, partindo da EfficientNet-B0 com pesos do ImageNet (`EfficientNet_B0_Weights.DEFAULT`) e separando os dados por lesão. Os números de AUC da seção de resultados são dessa reprodução.

**Classes.** Maligno = melanoma e carcinoma basocelular. Benigno = nevo, ceratose benigna, dermatofibroma e lesão vascular. A queratose actínica (akiec) ficou fora do treino.

**Pergunta de banca.** *Por que usar um modelo pré-treinado na Pele e uma CNN do zero nos outros?* Resposta: "Quisemos ter as duas experiências. A Pele é o problema mais difícil: imagens dermatoscópicas com diferenças sutis e um dataset desbalanceado, onde o pré-treino ajuda muito. Em Oral e Cérebro, uma CNN pequena feita do zero já resolveu bem o dataset, e mostrou que entendemos cada camada da rede."

**Pergunta de banca.** *O que é calibração?* Resposta: "É ajustar a saída da rede para que a probabilidade seja confiável. Sem calibração, uma rede pode dizer 95% e acertar só 70% dessas vezes. Na Pele usamos a calibração de Platt. Em Oral e Cérebro, a 'confiança' é o softmax da rede, que não é calibrado, e o site avisa isso."

### ONNX e ONNX Runtime

**O que é.** ONNX é um formato aberto para salvar redes neurais. O ONNX Runtime executa esse formato sem precisar do PyTorch.

**Como funciona.** Os scripts `export_onnx.py` (CNN) e `export_skin_ensemble.py` (Pele) leem o `.pt` dos notebooks e geram `<id>.onnx` + `<id>.json`. O JSON descreve o modelo: classes, tamanho, normalização, limiar e descrição. O ai-service carrega tudo uma vez, na subida.

**Por que o sistema usa.** O PyTorch tem centenas de MB e não é necessário para rodar o modelo. Com ONNX, o `requirements.txt` do serviço não tem `torch`, a imagem fica menor e a inferência é rápida em CPU.

### Pré-processamento igual ao treino

**O que é.** A imagem enviada precisa passar exatamente pelas mesmas etapas que as imagens do treino.

**Como funciona.**

- **Oral e Cérebro** (`preprocess`): OpenCV lê a imagem, converte BGR → RGB, redimensiona para 128×128, reorganiza para (canais, altura, largura) e divide por 255.
- **Pele** (`preprocess_pil`): PIL corrige a orientação EXIF, converte para RGB, redimensiona com bicúbico para 224×224 e aplica a normalização do ImageNet. Imagem com lado menor que 100 px é recusada.

**Por que importa.** Num teste, ler em BGR ou tirar a divisão por 255 derrubou a acurácia da Oral de 96,5% para cerca de 52%. Mesmo modelo, mesma imagem: só o pré-processamento mudou.

**Pergunta de banca.** *Qual foi o erro mais difícil de achar?* Resposta: "O OpenCV lê as cores em BGR, e o modelo foi treinado em RGB. A rede não dá erro: só passa a errar muito. Achamos comparando a saída do sistema com a do notebook para a mesma imagem."

### Inconclusivo e baixa certeza

| Módulo         | Regra                                                  | O que a tela mostra                       |
| --------------- | ------------------------------------------------------ | ----------------------------------------- |
| Oral e Cérebro | confiança abaixo de 80%                               | "Inconclusivo" no lugar da classe         |
| Pele            | maligno a partir de 18%; se nenhuma classe chega a 80% | mantém a classe e mostra "baixa certeza" |

```java
// DecisionService.decide
if (modelThreshold != null) {
    index = probabilities.get(1) >= modelThreshold ? 1 : 0;   // Pele: limiar próprio
} else {
    // Oral e Cérebro: a classe mais provável
}
if (cut != null && confidence < cut) {
    return new Decision(INCONCLUSIVE, confidence);
}
```

**Por que a Pele não tem inconclusivo.** Com o limiar de 18%, um caso com 35% de chance de maligno é justamente o que a triagem quer pegar. Esconder como "inconclusivo" iria contra o motivo do limiar. Por isso a classe fica, com o aviso.

## Resultados e honestidade

### O que foi medido

| Módulo  | Teste                                                       | Resultado                                                          |
| -------- | ----------------------------------------------------------- | ------------------------------------------------------------------ |
| Oral     | 200 imagens separadas, mesma fonte                          | 96,5% (193/200); com o limiar, 188 conclusivas e 98,4% de acerto   |
| Cérebro | 300 imagens separadas, mesma fonte                          | 98,3% (295/300); com o limiar, 297 conclusivas e 99,0%             |
| Cérebro | 5 folds, 1.000 imagens por classe                           | 95,17% ± 0,55 (cinza sem normalização, a melhor configuração) |
| Pele     | Reprodução do treino (1.915 imagens, divisão por lesão) | AUC 0,939; sensibilidade 89,0%; especificidade 83,7%               |
| Pele     | Modelo do app, 21 imagens internas                          | 8/8 malignos; 7/13 benignos (os 6 alarmes falsos tiveram aviso)    |

### Como ler esses números

- **Mesma fonte não é teste externo.** As imagens separadas de Oral e Cérebro vêm do mesmo dataset do treino. Elas medem se o modelo aprendeu o dataset, não se funciona em outro hospital.
- **Possível vazamento no Multi Cancer.** O dataset já vem aumentado (rotação, zoom, espelhamento) e não é dividido por paciente. Variações da mesma imagem podem cair no treino e no teste, e a acurácia alta pode medir memorização.
- **Evidência de mudança de domínio.** Um modelo de mama feito no mesmo processo teve 96,6% na mesma fonte e 34,5% em 29 imagens de outra fonte. Por isso ele saiu do sistema.
- **Pele: reprodução não é o modelo do app.** O código original do ensemble foi perdido; os números de AUC vêm de uma reprodução do treino. Na reprodução, a acurácia (84,5%) quase empata com chutar sempre "benigno" (83,9%), então AUC e sensibilidade são as métricas que importam.

### Métricas que a banca pode pedir

| Métrica               | O que diz                                                                                      |
| ---------------------- | ---------------------------------------------------------------------------------------------- |
| Acurácia              | Quantos acertos no total. Engana com classes desbalanceadas                                    |
| F1                     | Equilíbrio entre precisão e sensibilidade. Melhor que a acurácia com classes desbalanceadas |
| Sensibilidade (recall) | Dos doentes, quantos o modelo achou. É a que a triagem quer alta                              |
| Especificidade         | Dos saudáveis, quantos o modelo liberou corretamente                                          |
| VPP (precisão)        | Dos que o modelo chamou de maligno, quantos eram mesmo. Na Pele, 51,2%                         |
| AUC                    | Capacidade de separar as classes em todos os limiares; 0,5 é chute, 1,0 é perfeito           |

**Pergunta de banca.** *Com 98% de acurácia, por que não usar em hospital?* Resposta: "Porque os 98% são na mesma fonte do treino, com possível vazamento, e nunca houve validação clínica. Quando testamos o modelo de mama em imagens de outra fonte, a acurácia caiu para 34,5%. O sistema foi desenhado para mostrar essa incerteza, não para esconder."

## Infraestrutura: Docker e Terraform

### Docker e Dockerfile

**O que é.** Docker empacota o serviço com tudo de que ele precisa (sistema, linguagem, bibliotecas) numa imagem que roda igual em qualquer máquina.

**Onde está no código.**

- `backend/Dockerfile`: **multi-stage**. A primeira etapa compila com Maven + JDK 21; a segunda roda o `.jar` só com o JRE, mais leve. Usuário sem privilégios e `-XX:MaxRAMPercentage=70`, porque o Render gratuito tem 512 MB.
- `ai-service/Dockerfile`: Python 3.12-slim, usuário sem privilégios e `HEALTHCHECK` em `/health`.

**Pergunta de banca.** *Por que multi-stage?* Resposta: "O Maven e o JDK só servem para compilar. A imagem final leva só o JRE e o `.jar`, fica menor e tem menos coisa que poderia ter vulnerabilidade."

### Docker Compose (só desenvolvimento local)

**Como funciona.** `infra/docker-compose.yml` sobe quatro serviços numa rede interna: `db` (PostgreSQL 17 com volume), `ai-service` (sem porta exposta), `backend` (127.0.0.1:8080) e `frontend` (Vite em 127.0.0.1:5173). Cada serviço espera o anterior ficar saudável (`depends_on` com `service_healthy`).

**Cuidados de segurança.** Nenhuma senha no YAML: tudo vem do `infra/.env`. As portas abrem só em `127.0.0.1`, então ninguém da rede acessa. A IA só é acessível pelo backend.

**Por que não tem nginx.** O nginx servia o React e repassava `/api`. Hoje a Vercel serve o site e faz o repasse, e no desenvolvimento o próprio Vite repassa. Ele ficou sem função e foi removido.

**Plano B da banca.** Se a internet falhar, `docker compose up` roda o sistema inteiro no notebook.

### Terraform (infraestrutura como código)

**O que é.** Uma ferramenta que descreve a infraestrutura em arquivos (`.tf`) e cria ou altera os recursos nos provedores para ficarem iguais ao arquivo.

**Onde está no código.** `infra/terraform/main.tf` cria o projeto da Vercel, os dois serviços do Render com os grupos de variáveis e usa o banco do Neon. As versões dos provedores são fixas (`.terraform.lock.hcl` versionado).

```hcl
resource "random_password" "jwt_secret" {
  length = 64
}

resource "render_env_group" "backend" {
  env_vars = {
    JWT_SECRET       = { value = random_password.jwt_secret.result }
    AI_SERVICE_TOKEN = { value = random_password.ai_service_token.result }
    ...
  }
}
```

**Detalhes que a banca pode perguntar.**

- **Segredos gerados pelo próprio Terraform**: `JWT_SECRET` (64 caracteres) e `AI_SERVICE_TOKEN` (48). Ninguém digitou essas senhas.
- **`prevent_destroy` no banco**: impede que um `terraform destroy` ou uma mudança apague o Neon com os dados.
- **State (`terraform.tfstate`)**: o arquivo onde o Terraform lembra o que criou. Ele guarda segredos em texto, fica fora do git e tem backup fora do repositório. Perdê-lo faz o Terraform "esquecer" os recursos.
- **Blocos `moved`**: renomearam os recursos antigos (em português) sem destruir nada.
- **Limitação do Render gratuito**: o provedor tenta mudar o modo de manutenção a cada atualização, e o plano gratuito recusa. Por isso as variáveis ficam em *env groups*.

**Pergunta de banca.** *Qual a diferença entre Docker e Terraform?* Resposta: "O Docker empacota cada serviço numa imagem. O Terraform cria a infraestrutura onde essas imagens rodam: os serviços do Render, o projeto da Vercel e as variáveis. O Render lê o Dockerfile de cada pasta e builda a imagem a cada push na main."

## Processos (BPMN)

Três workflows em BPMN 2.0, em `docs/bpmn/`, gerados por código (`docs/bpmn/generator/generate.py`) para ficarem iguais ao sistema:

| Workflow                | O que mostra                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------- |
| 1. Login e cadastro     | Validação, hash BCrypt, mensagem genérica, JWT de 8 horas, onde o token fica                         |
| 2. Microsserviço de IA | Subida com os modelos, token interno, recusas 401/404/422, quem decide a classe                         |
| 3. Uso do sistema       | Começa com o usuário logado: módulo, imagem, consentimento, análise, decisão, resultado com avisos |

**Pergunta de banca.** *Por que o workflow 3 começa com o usuário logado?* Resposta: "Foi pedido do orientador: o login já está detalhado no workflow 1, e repetir deixaria o diagrama de uso poluído."

## Governança, ética e privacidade

- **Não é diagnóstico**: todas as telas de análise mostram que o modelo é experimental; há uma página de limitações.
- **Consentimento**: antes de cada análise, o usuário confirma que o material é autorizado e desidentificado.
- **Minimização (LGPD)**: a imagem é processada em memória e descartada. O banco guarda só usuário, modelo, classe, confiança, probabilidades de cada classe, tempo e horário. O log guarda só o id do usuário.
- **Isolamento**: cada usuário vê só o próprio histórico, porque o backend filtra pelo id do token, nunca por um parâmetro do navegador.
- **Licenças**: Multi Cancer e HAM10000 são CC BY-NC-SA 4.0: crédito obrigatório e **sem uso comercial**. Por isso o ganho de tempo é hipotético e não calculamos retorno financeiro.
- **Viés**: o HAM10000 é desbalanceado (nevo ~67%, dermatofibroma ~1%); o desempenho em tons de pele pouco representados é desconhecido.
- **Limitação assumida**: o sistema não recusa imagens sem relação. Uma foto qualquer recebe uma das classes. Trabalho futuro: um filtro que identifique o tipo de exame antes.

**Pergunta de banca.** *Que dados pessoais o sistema guarda?* Resposta: "Nome, e-mail e hash da senha de quem se cadastra. Das análises, só modelo, classe, confiança, probabilidades de cada classe e horário, ligados ao id do usuário. A imagem não é guardada em lugar nenhum."

## Testes e qualidade

| Onde       | O que                                                              | Como rodar                                       |
| ---------- | ------------------------------------------------------------------ | ------------------------------------------------ |
| Backend    | 5 testes: regra de decisão e leitura do CSV real                  | `mvn test`                                     |
| ai-service | 20 testes: rotas, token, pré-processamento, modelos reais e erros | `pytest`                                       |
| Frontend   | ESLint sem erros nem avisos; build de produção                   | `npm run lint` e `npm run build`             |
| Terraform  | formatação, validação e plano sem mudanças                    | `terraform fmt -check`, `validate`, `plan` |

**Pergunta de banca.** *O que os testes do backend garantem?* Resposta: "Que a regra de decisão está certa (inconclusivo abaixo de 80%, limiar da Pele) e que o CSV real dos notebooks é lido sem erro. São as duas partes que, se quebrarem, mostram um resultado errado sem dar erro nenhum."

## Onde está cada regra

Na banca, a pergunta costuma vir como "onde está a lógica de X?". Responda seguindo o caminho da requisição: o que a tela barra, qual método do backend valida e o que a IA confere.

| Regra                                             | Onde está                                                                                                      |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Imagem até 10 MB, PNG/JPG/WEBP                   | Tela (`ImageDropzone`), backend (`spring.servlet.multipart.max-file-size`) e ai-service (`MAX_UPLOAD_MB`) |
| Imagem ilegível ou muito pequena (Pele < 100 px) | ai-service: `preprocess` e `preprocess_pil` → 422                                                          |
| Inconclusivo abaixo de 80% (Oral e Cérebro)      | `DecisionService.decide` + `INCONCLUSIVE_THRESHOLD`                                                         |
| Maligno a partir de 18% (Pele)                    | `threshold` no `skin_color.json`, aplicado no `DecisionService.decide`                                    |
| Etiqueta "baixa certeza"                          | `utils/resultView.js` (`isLowConfidence`) e `LowConfidenceTag`                                            |
| Cada usuário vê só o próprio histórico       | `PredictionService.history(userId)`, com o id vindo do JWT                                                    |
| E-mail único no cadastro                         | `AuthService.register` (409) + coluna única na tabela `users`                                              |
| Senha de 8 a 128 caracteres, nome de 2 a 80       | Validação do DTO `RegisterRequest` (`@Valid`)                                                             |
| Só o backend chama a IA                          | `require_token` no ai-service + `AI_SERVICE_TOKEN`                                                          |
| Classes malignas em vermelho                      | `MALIGNANT_CLASSES` em `utils/modules.js` e `ProbabilityPieChart`                                         |
| Nome por extenso das classes (scc, menin)         | `CLASS_NAMES` e `className` em `utils/modules.js`                                                         |
| Cards de resumo do histórico                      | `summarizeHistory` em `utils/resultView.js` e `HistorySummary`                                            |
| Importação dos treinos sem duplicar             | `TrainingService.importCsv` (chave data/hora + dataset)                                                       |

## Perguntas rápidas de banca

Respostas de uma ou duas frases para revisar na véspera. O detalhe de cada uma está na seção do conceito.

| Pergunta                             | Resposta curta                                                                                                                            |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| O que o PixoraMed faz?               | Classifica imagens de Pele, Oral e Cérebro e mostra a probabilidade de cada classe, com histórico e limitações. Não é diagnóstico. |
| Por que três serviços?             | Cada um com a linguagem certa: React na tela, Java no login e nas regras, Python na IA. A IA fica isolada dos dados de usuário.          |
| Quem decide a classe?                | O backend (`DecisionService`). A IA só devolve probabilidades.                                                                         |
| Quais métodos HTTP o sistema usa?    | Só `GET` (ler: saúde, modelos, treinos, histórico) e `POST` (criar: cadastro, login, análise). Não há edição nem exclusão de dados.     |
| Para que serve o model no backend?   | É a entidade JPA (`User`, `Training`, `Prediction`): cada classe vira uma tabela, e o repository grava e lê esses objetos.             |
| O que é stateless?                  | O servidor não guarda sessão; a identidade vem no JWT de cada requisição.                                                             |
| Por que BCrypt?                      | Hash lento e com salt: se o banco vazar, as senhas não aparecem.                                                                         |
| Para que serve o X-Internal-Token?   | Só o backend pode usar a IA, mesmo com a URL pública no Render.                                                                         |
| Onde ficam os segredos?              | Em variáveis de ambiente: `.env` local (fora do git) e env groups do Render, preenchidos pelo Terraform.                               |
| Qual `.env` o Docker usa?          | Só o `infra/.env`. Os `.env` das pastas servem para rodar fora do Docker.                                                            |
| Para que serve o log?                | Saber o que aconteceu (login, análise, falha da IA) sem guardar e-mail, senha, token ou imagem.                                          |
| Onde vejo o log?                     | Docker Desktop ou `docker compose logs`, janela Run do IntelliJ, aba Logs do Render.                                                    |
| O que é uma CNN?                    | Rede com filtros convolucionais que aprendem padrões da imagem, de bordas a formas.                                                      |
| O que é transfer learning?          | Partir de uma rede já treinada (EfficientNet-B0 no ImageNet) e ajustá-la para pele.                                                     |
| Por que um ensemble?                 | A média de 5 redes é mais estável que uma só.                                                                                         |
| Por que o limiar de 18% na Pele?     | Na triagem, perder um câncer é pior que um alarme falso; o limiar aumenta a sensibilidade.                                              |
| Por que "inconclusivo"?              | Em Oral e Cérebro, abaixo de 80% de confiança o sistema não afirma uma classe.                                                         |
| O que é ONNX?                       | Formato aberto de rede neural; roda sem PyTorch, com imagem menor e inferência rápida.                                                  |
| Por que a acurácia alta não basta? | É na mesma fonte, com possível vazamento; em outra fonte, o modelo de mama caiu de 96,6% para 34,5%.                                    |
| O que é validação cruzada?        | Treinar e testar 5 vezes, trocando a parte de teste, para medir a média e a variação.                                                  |
| Docker ou Terraform?                 | Docker empacota cada serviço; Terraform cria a infraestrutura na nuvem onde eles rodam.                                                  |
| Por que `prevent_destroy`?         | Impede que o Terraform apague o banco do Neon, que tem os dados.                                                                          |
| A imagem fica guardada?              | Não. É processada em memória e descartada; o banco guarda só o resultado.                                                             |
| Pode usar comercialmente?            | Não: os datasets são CC BY-NC-SA 4.0, sem uso comercial.                                                                                |
| O que fariam a seguir?               | Testar com imagens de outra fonte, filtro de tipo de exame, calibrar Oral e Cérebro, limite de tentativas de login.                      |
