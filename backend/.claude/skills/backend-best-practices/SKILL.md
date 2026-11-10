---
name: backend-best-practices
description: Boas práticas arquiteturais do backend do PixoraMed (onde colocar cada responsabilidade, transações, validação nas bordas, erros, segredos, configuração 12-factor, privacidade e honestidade dos resultados). Use ao planejar uma funcionalidade nova no backend ou revisar uma mudança.
---

# Boas práticas de arquitetura do backend

Estas regras são sobre **onde** as coisas ficam e **como** os serviços se relacionam, não sobre formatação de código.

## 1. Uma responsabilidade por camada

- Regra de negócio nova vai num service. Se o controller começar a ter `if` de negócio, mova para o service.
- Um service por assunto (`AuthService`, `PredictionService`, `TrainingService`, `DecisionService`). Lógica pura, como a decisão da classe, fica isolada e testável sem Spring e sem banco.
- Integração externa (o ai-service) fica atrás de um único cliente (`AiServiceClient`), que traduz as falhas dela para `ApiException`.

## 2. Validar nas bordas

- Entrada do usuário é validada no DTO (`@NotBlank`, `@Size`, `@Email`) antes de chegar ao service.
- O que vem de fora (CSV, resposta da IA) é convertido num formato do sistema na entrada (`TrainingService.parseCsv`, `@JsonAlias`); o resto do código não conhece o formato externo.
- Limite de upload no próprio Spring (`spring.servlet.multipart.max-file-size`).

## 3. Entidade não sai da API

A resposta é sempre um DTO criado a partir da entidade (`UserResponse.from(user)`). Assim o hash da senha nunca vaza e o banco pode mudar sem quebrar o frontend.

## 4. Erros padronizados

- Erro esperado: `throw new ApiException(HttpStatus.X, "mensagem para a tela")`.
- Erro inesperado: o `GlobalExceptionHandler` registra no log e responde 500 sem detalhes internos.
- Mesma mensagem para "e-mail não existe" e "senha errada", para não revelar quem tem conta.

## 5. Transações e idempotência

- Cada operação de escrita grava tudo ou nada (o `save`/`saveAll` do Spring Data já é transacional). Se um service passar a gravar em mais de uma tabela, anote o método com `@Transactional`.
- Rotinas que rodam na subida precisam ser idempotentes: a importação do CSV só insere o que falta e nunca apaga.

## 6. Configuração externa (12-factor)

- Nada de URL, senha, token ou limiar escrito no código: tudo é `${VAR}` no `application.properties`, com valor padrão só para o que não é segredo.
- Faltou variável obrigatória: a aplicação não sobe. Erro cedo é melhor que erro na primeira requisição.
- Variável nova entra também no `.env.example` (com comentário), no `infra/docker-compose.yml` e no `infra/terraform/main.tf`.

## 7. Segredos e logs

- Segredos só em variável de ambiente; nunca em commit, log ou mensagem de erro.
- Logue eventos (falha da IA, quantidade importada), nunca dados pessoais, senha, token ou imagem.

## 8. Privacidade

- A imagem passa em memória para a IA e é descartada. O banco guarda só modelo, classe, confiança, tempo, horário e usuário.
- Toda consulta de histórico filtra pelo usuário do token, nunca por um id vindo do cliente.

## 9. Honestidade dos resultados

- Nunca invente métricas: a tela mostra só o que está no `.json` do modelo ou no CSV.
- A "confiança" de Oral e Cérebro é softmax, não probabilidade calibrada. O aviso de que o resultado não é diagnóstico vai em toda resposta de análise.

## 10. Mudanças de contrato

Alterar rota, campo JSON ou nome de tabela/coluna quebra outra parte. Faça a mudança no backend e no frontend no mesmo commit, e coluna renomeada no banco exige SQL manual testado num branch do Neon antes da produção.
