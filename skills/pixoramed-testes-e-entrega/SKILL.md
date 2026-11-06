---
name: pixoramed-testes-e-entrega
description: Verifique o PixoraMed de ponta a ponta e confira os requisitos da banca antes de declarar o sistema pronto. Use ao terminar uma etapa importante, antes de um commit grande, de um deploy ou da entrega do projeto.
---

# Testes e entrega

Não declare que algo funciona sem ter executado. Relate falhas com a saída real e diga o que não pôde ser testado.

## Cuidados antes de testar

- Use banco temporário. Antes de escrever, confirme que a porta 8000 está livre e que a API é a de teste.
- Não apague dados do usuário. Remova só o que você criou para testar.
- Imagens sintéticas servem para testar o fluxo, nunca para medir qualidade.

## Checklist técnico

**Backend**

- [ ] `pytest` passa em `backend/`.
- [ ] `/api/saude` responde com e sem modelos.
- [ ] Reimportar o CSV insere 0 linhas.
- [ ] Imagem inválida ou arquivo vazio devolvem 422 nos três módulos, modelo inexistente devolve 404 e arquivo grande devolve 413.
- [ ] A tabela `previsoes` não guarda imagem.

**Modelos**

- [ ] `GET /api/modelos` lista os modelos, com classes e escala certas.
- [ ] O ONNX dá a mesma matriz de confusão do `.pt` nas imagens separadas.
- [ ] O pré-processamento da API é igual ao do treino, incluindo RGB no Oral e cinza sem divisão no Cérebro.
- [ ] Oral: confiança baixa gera `inconclusivo`.
- [ ] Pele: probabilidade de 20% gera `maligno`, com aviso de baixa certeza na tela; 12% gera `benigno`, sem aviso.

**Frontend**

- [ ] `npm ci` e `npm run build` passam.
- [ ] O fluxo Exame, Revisão e Resultado funciona nos três módulos.
- [ ] Sem modelo, o módulo mostra "Modelo não conectado" e bloqueia o avanço.
- [ ] Um registro aberto pelo histórico funciona sem imagem nem probabilidades.
- [ ] A classe `tumor` aparece como `hipofisário`, inclusive na exportação CSV.
- [ ] A página funciona no celular, sem erros no console.

**Infraestrutura**

- [ ] `docker compose up --build` sobe os três serviços, e o fluxo funciona em `localhost:8080`.
- [ ] Teste com 512 MB e 0,1 de CPU sem queda por falta de memória.
- [ ] `terraform validate` passa.
- [ ] Nenhum segredo está no git.

**Honestidade**

- [ ] Nenhum número de resultado foi inventado.
- [ ] Testes da mesma fonte não foram chamados de externos.
- [ ] Os resultados da reprodução da Pele estão separados do `pele_cor`.
- [ ] Cenários de ganho de tempo ou ROI estão marcados como hipotéticos.
- [ ] Avisos, limitações e créditos aparecem nas telas previstas.

## Requisitos da banca

Apresentação de até 20 minutos: contexto (3), BPMN e arquitetura (3), demonstração ao vivo (6), detalhamento técnico (4), governança e ética (2) e conclusão (2).

| Requisito | Onde está no projeto |
|---|---|
| BPMN 2.0 | `docs/processo_bpmn.png` e README |
| Python e Pandas | `backend/app/importacao.py` e notebooks |
| SQL | `backend/app/tabelas.py` e `db.py` |
| Visualização | Página de resultados e gráficos dos notebooks |
| Modelo de ML | `models/` e notebooks |
| Interface funcional | `frontend/` |
| Terraform ou contêineres | `infra/terraform/` e `docker-compose.yml` |
| Governança e ética | Página de limitações e documentação |

Critérios: inovação e negócio (20%), técnica e arquitetura (30%), protótipo e usabilidade (20%), governança e ética (15%), comunicação (15%).

## Entregáveis até 48 horas antes

- [ ] Repositório Git limpo, com README sobre arquitetura, pré-requisitos e como rodar, e com acesso liberado à banca.
- [ ] PDF com o BPMN, a justificativa técnica e a análise de ética e segurança.
- [ ] Deck em PDF ou PPTX.
- [ ] Vídeo de backup da demonstração. **Só o grupo pode gravar.**

## README

Inclua: objetivo e aviso de que não é diagnóstico, workflow BPMN, diagrama e tabela da arquitetura, tabela de módulos, estrutura de pastas, pré-requisitos (Python 3.12+, Node 22+, Docker opcional), como rodar com e sem Docker, testes, como adicionar um modelo, como atualizar resultados, limitações e créditos.

## Relatório

Termine com: o que foi verificado e como, o que falhou, o que não foi testado (por exemplo, Render real ou imagens de outra fonte) e o que depende do grupo.
