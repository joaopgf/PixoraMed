---
name: pixoramed-orquestrador
description: Coordene a construção completa do PixoraMed, chamando as demais skills pixoramed-* na ordem certa e conferindo cada etapa. Use quando o pedido for criar, recriar ou montar o sistema inteiro, ou quando não estiver claro qual parte do projeto deve ser feita primeiro.
---

# Orquestrador do PixoraMed

O PixoraMed é um protótipo acadêmico que classifica imagens médicas de câncer de pele, oral e cérebro e mostra os resultados em um app web. Esta skill não escreve o sistema sozinha: ela define a ordem, chama as skills especializadas e só avança quando a etapa atual foi conferida.

## Antes de começar

1. Leia `pixoramed-regras-do-produto` e `pixoramed-boas-praticas`. Elas valem durante todo o trabalho.
2. Confira a pasta do projeto. Se já houver código, integre-se a ele e não sobrescreva nada sem pedir.
3. Confira quais insumos existem:

| Insumo | Onde deve ficar | Sem ele |
|---|---|---|
| Modelos prontos (`*.onnx` e `*.json`) | `models/` | O app funciona e mostra "Modelo não conectado" |
| Modelos em PyTorch (`.pt`) | Pasta indicada pelo usuário | Execute `pixoramed-treino-modelos`, se houver dataset e GPU |
| Tabela de treinos | `data/resultados.csv` | A página de resultados fica sem execuções |
| Workflow BPMN | `docs/processo_bpmn.png` | O README fica sem o diagrama; peça a imagem ao grupo |
| Imagens das telas e dos gráficos | `frontend/public/` | Use estados vazios; não invente imagens de resultados |

4. Pergunte ao usuário só o que impede o trabalho: pasta do projeto, onde estão os modelos e se o deploy deve ser feito. Para o resto, siga as regras destas skills.

## Ordem das etapas

| Etapa | Skill | Pronta quando |
|---|---|---|
| 1. Estrutura do repositório | `pixoramed-boas-praticas` | Pastas, `.gitignore`, `.gitattributes` e `.env.example` criados |
| 2. Banco e importação | `pixoramed-banco-dados` | Tabelas criadas e `resultados.csv` importado sem duplicar |
| 3. API | `pixoramed-backend` | `/api/saude` responde, mesmo sem modelos |
| 4. Treino, se necessário | `pixoramed-treino-modelos` | `.pt` e métricas gerados pelo usuário em GPU |
| 5. Conversão | `pixoramed-exportacao-onnx` | Modelos carregados, com diferença PyTorch x ONNX conferida |
| 6. Interface | `pixoramed-frontend` | Fluxo de análise funciona de ponta a ponta |
| 7. Textos de responsabilidade | `pixoramed-governanca` | Avisos, limitações e créditos presentes nas telas |
| 8. Infraestrutura | `pixoramed-infraestrutura` | `docker compose up --build` sobe tudo e `terraform validate` passa |
| 9. Verificação final | `pixoramed-testes-e-entrega` | Checklist cumprido e pendências relatadas |

Etapas 2 e 3 podem ser feitas juntas. A etapa 4 é opcional quando os modelos já existem. Se os ONNX vieram prontos, sem `.pt`, a etapa 5 se resume a confirmar a carga na API. Sem Docker ou Terraform na máquina, faça a etapa 8 e relate o que ficou sem verificar.

## Regras de condução

- Termine uma etapa antes de iniciar a seguinte e rode as verificações de cada skill.
- O contrato da API em `pixoramed-backend` é a fonte da verdade entre back e front. Se ele mudar, atualize as duas partes.
- Não execute treinos longos sem o usuário pedir. Prepare o notebook e peça para ele rodar na GPU.
- Não faça commit, push nem deploy sem pedido explícito. Eles também não valem para pedidos futuros.
- Se uma verificação falhar, investigue a causa. Não apague testes nem invente resultados para fazer a etapa passar.
- Se algo não puder ser feito, como treino sem dataset, avance no que for possível e informe a pendência no relatório final.

## Relatório final

Ao terminar, informe:

1. O que foi criado e verificado.
2. Quais modelos estão conectados e de onde vieram.
3. O que ficou pendente e o que o grupo precisa fazer.
4. Os comandos para rodar o sistema.

Não diga que algo funciona se não foi testado.
