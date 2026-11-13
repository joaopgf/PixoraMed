---
name: backend-architecture
description: Arquitetura do backend Spring Boot do PixoraMed (camadas, contrato da API, segurança, banco, integração com o ai-service e regra de decisão). Use antes de criar ou alterar controllers, services, entidades, DTOs, rotas, configuração ou a chamada ao ai-service.
---

# Arquitetura do backend

## Papel no sistema

O backend é a única porta de entrada de dados do sistema. Ele autentica o usuário, guarda o histórico, importa os resultados dos treinos e **decide a classe final**. Não serve o site (que fica na Vercel) e não carrega modelos (que ficam no ai-service).

```
frontend --/api--> controller -> service -> repository -> PostgreSQL
                                   |
                                   +-> AiServiceClient --HTTP + X-Internal-Token--> ai-service
```

## Camadas e regra de dependência

A dependência só vai para baixo: `controller → service → repository → model`. Nenhuma camada de baixo conhece a de cima.

| Pacote | Responsabilidade | Não pode |
|---|---|---|
| `controller` | Mapear HTTP, validar o DTO (`@Valid`) e pegar o usuário do JWT | Ter regra de negócio ou acessar repository |
| `service` | Regras de negócio e orquestração (login, decisão, importação, chamada à IA) | Montar resposta HTTP ou ler header |
| `repository` | Consultas JPA | Ter regra de negócio |
| `model` | Entidades JPA (`User`, `Training`, `Prediction`) | Sair na resposta da API |
| `dto` | Formatos de entrada/saída (records) | Ter lógica além de conversão (`from`) |
| `security` | `SecurityConfig` (rotas públicas, JWT, BCrypt, CORS) e `TokenService` | Ter regra de negócio |
| `exception` | `ApiException` e `GlobalExceptionHandler` | — |

Toda resposta usa DTO. Toda falha esperada é uma `ApiException(status, mensagem)`, e o `GlobalExceptionHandler` transforma em `{"message": "..."}`. A mensagem é exibida na tela, então fica em português; o resto do código fica em inglês.

## Contrato da API

- Prefixo único `/api`, rotas em inglês, substantivos no plural, kebab-case: `/api/auth/login`, `/api/predictions`, `/api/trainings`, `/api/models`, `/api/health`.
- Campos JSON em camelCase (`predictedClass`, `expiresAt`).
- Mudar rota ou campo quebra o frontend: altere `frontend/src/api` no mesmo commit.
- Sem versionamento nem paginação hoje: o histórico usa `?limit=` (máximo 100). Se a lista crescer, o alvo é paginação com `page`/`size`.

## Segurança

- **Login:** BCrypt para a senha; JWT HS256 assinado com `JWT_SECRET`, com o id do usuário no `subject` e validade de `JWT_EXPIRATION_HOURS`. O Spring valida o token (`oauth2ResourceServer().jwt()`); o controller lê o usuário com `@AuthenticationPrincipal Jwt`.
- **Autorização:** só cadastro, login, health, trainings e models são públicos; o resto exige token. Cada usuário vê só as próprias análises (filtro por `userId` no service).
- **CORS:** origens vindas de `CORS_ALLOWED_ORIGINS`.
- **Conta (`/api/users/me`):** o usuário vê, edita nome e e-mail, troca a senha (pede a atual) e exclui a conta com o histórico (hard delete, pede a senha). Senha errada responde 400, não 401. Regras de tamanho em `dto/AccountRules.java` (senha até 72 bytes por causa do BCrypt).
- **Ainda falta (alvo):** limite de tentativas de login (rate limit), recuperação de senha e revogação de token (o token de uma conta com senha trocada vale até vencer; as rotas da conta e a análise recusam conta excluída).

## Banco

- PostgreSQL, sem migrations: o Hibernate cria e atualiza as tabelas (`ddl-auto=update`). Isso só acrescenta; **renomear ou apagar coluna exige SQL manual** no Neon, testado antes num branch do Neon.
- Tabelas: `users`, `trainings` (do CSV) e `predictions` (sem imagem). Aumentar o tamanho de uma coluna também exige SQL manual (ex.: `ALTER TABLE users ALTER COLUMN name TYPE varchar(255)`).
- `training-results.csv` (em `resources/data`) é importado na subida, de forma idempotente (chave `runAt` + `dataset`).

## Integração com o ai-service

- `AiServiceClient` é o único lugar que conhece o ai-service: URL e token vêm de `AI_SERVICE_URL` e `AI_SERVICE_TOKEN`; o JSON da IA vem em snake_case e é lido com `@JsonAlias`.
- Timeout de `AI_SERVICE_TIMEOUT_SECONDS` (120 s), porque o Render gratuito "dorme" e acorda em ~1 minuto.
- A lista de modelos fica em cache por 5 minutos.
- Erros 404/413/422 da IA voltam para a tela com a mensagem dela; qualquer outra falha vira 503 "serviço de IA indisponível". 401 da IA indica token diferente nos dois serviços.

## Regra de decisão (DecisionService)

- **Sem limiar próprio (Oral, Cérebro):** a classe é a de maior probabilidade; abaixo de `INCONCLUSIVE_THRESHOLD` (0,8), o resultado é `inconclusive`.
- **Com limiar próprio (Pele, `threshold` no .json do modelo):** a segunda classe (`malignant`) vence quando a probabilidade dela alcança o limiar (~0,18), mesmo abaixo de 50%. Não há inconclusivo; a tela avisa "baixa certeza" quando nenhuma classe passa de 0,8 (`lowConfidenceThreshold`).
- A IA nunca decide a classe. Mudar a regra é mudar só o `DecisionService` e o teste dele.

## Configuração

Tudo por variável de ambiente (`application.properties` só tem `${VAR}`). Variável sem padrão é obrigatória e impede a subida se faltar. Nenhum segredo tem valor padrão no código. Lista em `backend/.env.example`.

## Observabilidade

Hoje: log do Spring no console (o Render guarda) e `/api/health` para o health check. Logs nunca incluem senha, token, e-mail ou a imagem; o usuário aparece só pelo id.

Eventos registrados:

| Onde | Evento | Nível |
|---|---|---|
| `AuthService` | cadastro (id do usuário) e cadastro recusado por e-mail repetido | INFO |
| `AuthService` | login aceito (id) | INFO |
| `AuthService` | login recusado: e-mail não cadastrado, ou senha incorreta (id) | WARN |
| `PredictionService` | análise concluída: id, usuário, modelo, classe, confiança e tempo da IA | INFO |
| `PredictionService` | análise não concluída: usuário, modelo e status (404, 413, 422, 503) | WARN |
| `AiServiceClient` | IA sem resposta, IA recusou o token | WARN / ERROR |
| `TrainingService` | quantidade de treinos importados | INFO |
| `GlobalExceptionHandler` | erro inesperado, com o rastro da pilha | ERROR |

Texto que vem do navegador (como o `modelId`) passa por limpeza antes de ir ao log, para não criar linhas falsas.
