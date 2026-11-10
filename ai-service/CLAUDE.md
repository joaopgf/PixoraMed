# ai-service (FastAPI + ONNX)

Microsserviço de IA do PixoraMed. Detalhes de uso em `README.md`.

Antes de mexer no código, leia as skills desta pasta:

- `.claude/skills/ai-service-architecture`: contrato, modelos, pré-processamento, token interno e limites.
- `.claude/skills/ai-service-best-practices`: serviço sem estado, decisão fora da IA, dependências e honestidade.

Regras rápidas: código e nomes em inglês (snake_case), mensagens da tela em português; dependências só no `requirements.txt`; nada de PyTorch na imagem.

Validar: `pytest`.
