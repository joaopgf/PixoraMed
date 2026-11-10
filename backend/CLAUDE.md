# backend (Spring Boot)

API do PixoraMed em Java 21 + Spring Boot 4. Detalhes de uso em `README.md`.

Antes de mexer no código, leia as skills desta pasta:

- `.claude/skills/backend-architecture`: camadas, contrato da API, segurança, banco, ai-service e regra de decisão.
- `.claude/skills/backend-best-practices`: onde colocar cada responsabilidade e como evitar quebras.

Regras rápidas: código e nomes em inglês, mensagens da tela em português; configuração só por variável de ambiente; infraestrutura fica em `../infra`, não aqui.

Validar: `mvn test` (e `mvn package` para o build).
