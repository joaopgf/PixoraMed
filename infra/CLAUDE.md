# infra (docker compose + Terraform)

Infraestrutura do PixoraMed, separada do código dos serviços. Detalhes de uso em `README.md`.

Antes de mexer, leia `.claude/skills/infra-architecture` (ambientes, segredos, cuidados com o Neon e com o Render gratuito).

Regras rápidas: nunca rode `terraform apply` ou `destroy` sem pedido explícito; o Neon não pode ser recriado; nenhum segredo em arquivo versionado.

Validar: `docker compose config --quiet` e, em `terraform/`, `terraform fmt -check -recursive` e `terraform validate`.
