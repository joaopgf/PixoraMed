# Skills do PixoraMed

Skills para uma IA de programação construir o PixoraMed. Cada pasta tem um `SKILL.md`, com `name` e `description` no cabeçalho, no mesmo formato dos exemplos do curso.

## Como usar

1. Copie as pastas para o local de skills da sua ferramenta. No Claude Code, é `.claude/skills/` dentro de uma pasta vazia.
2. Coloque na pasta do projeto os insumos que já tiver (veja abaixo).
3. Peça para a IA:

> Use a skill pixoramed-orquestrador para criar o sistema PixoraMed nesta pasta.

## As skills

| Skill | Papel |
|---|---|
| `pixoramed-orquestrador` | Define a ordem, chama as outras skills e confere cada etapa |
| `pixoramed-regras-do-produto` | Escopo, classes, limiares, decisões e resultados medidos |
| `pixoramed-boas-praticas` | Estrutura de pastas, código, ambiente virtual, git e segurança |
| `pixoramed-treino-modelos` | Notebooks PyTorch, divisão dos dados e métricas |
| `pixoramed-exportacao-onnx` | Conversão dos modelos para ONNX |
| `pixoramed-banco-dados` | Tabelas SQL e importação com Pandas |
| `pixoramed-backend` | API FastAPI, inferência e contrato com o front |
| `pixoramed-frontend` | Telas em React, fluxo de análise e identidade visual |
| `pixoramed-infraestrutura` | Docker, nginx e Terraform |
| `pixoramed-governanca` | Avisos, limitações e créditos |
| `pixoramed-testes-e-entrega` | Verificação final e requisitos da banca |

## O que as skills não criam

Texto não gera pesos de modelo nem resultados de treino. Para o sistema ficar igual ao atual, são necessários também:

- **Modelos:** `models/*.onnx` e `*.json`, ou os `.pt` para converter, ou o dataset com GPU para treinar.
- **Tabela de treinos:** `data/resultados.csv`.
- **Imagens:** `docs/processo_bpmn.png`, as ilustrações de `frontend/public/organs/` e os gráficos de `frontend/public/resultados/pele/`.

Sem os modelos, o app funciona, mas mostra "Modelo não conectado". A skill de regras proíbe inventar métricas para preencher essa falta.

## Diferenças em relação ao código atual

As skills corrigem três pontos de propósito:

1. **Catálogo:** o aviso não diz mais que o modelo sempre responde com uma classe, porque agora existe o inconclusivo.
2. **Etiqueta:** `vazamento` passa a ser `possível vazamento`.
3. **Gráficos de resultados:** a média considera só execuções da mesma configuração e sem variante.

## Como foram testadas

Um agente de IA, em uma pasta vazia e sem acesso ao código, recriou o sistema usando só estas skills, os modelos ONNX e o `resultados.csv`.

- Testes do backend, build do frontend e `terraform validate` passaram.
- O sistema subiu no Docker com 512 MB e 0,1 de CPU, e o fluxo na tela funcionou com imagens reais, com os mesmos resultados do app atual.
- As lacunas encontradas foram corrigidas nas skills depois desse teste. **A versão corrigida não passou por uma nova reconstrução completa.**
- Não foram testados: os scripts de exportação, os treinos, o deploy real e a aparência idêntica à do app atual. O sistema recriado funciona, mas o visual e alguns textos saem diferentes.
