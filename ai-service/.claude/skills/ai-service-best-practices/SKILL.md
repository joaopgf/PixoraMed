---
name: ai-service-best-practices
description: Boas práticas arquiteturais do microsserviço de IA do PixoraMed (serviço sem estado, decisão fora da IA, modelo descrito por metadados, dependências num único requirements.txt, imagem enxuta, segurança e honestidade das métricas). Use ao planejar mudanças no ai-service, adicionar um modelo ou revisar uma alteração.
---

# Boas práticas de arquitetura do ai-service

## 1. Sem estado e sem dados

O serviço recebe, calcula, responde e descarta. Não grava arquivo, não acessa banco e não guarda a imagem. Assim ele pode reiniciar ou escalar sem perder nada.

## 2. A IA mede, o backend decide

O ai-service devolve probabilidades. Classe final, inconclusivo e avisos são do backend. Não acrescente regra de decisão aqui: ela ficaria duplicada e desencontrada.

## 3. O modelo se descreve

Tudo que muda de um modelo para outro (classes, tamanho, escala, normalização, limiar, métricas) fica no `.json` dele, nunca em `if` no código. O código só segue o que o `.json` diz.

## 4. Treino e servidor separados

- O treino acontece nos notebooks (PyTorch, GPU). O servidor só roda ONNX na CPU, sem PyTorch.
- A conversão é feita pelos `scripts/` na máquina de quem exporta, e o script confere se o ONNX dá a mesma saída que o PyTorch antes de gravar.

## 5. Dependências

- Um único `requirements.txt`, com versão fixa (`==`), agrupado em execução e testes.
- Dependência pesada usada só fora do servidor (PyTorch, para exportar) não entra no arquivo: é instalada com o comando do README, para a imagem não crescer ~700 MB.
- Ao atualizar uma versão, rode `pytest` num ambiente limpo antes do commit.

## 6. Imagem Docker enxuta e segura

`python:3.12-slim`, só `app/` e `models/` na imagem (testes e scripts ficam fora pelo `.dockerignore`), usuário sem privilégios e `HEALTHCHECK` em `/health`.

## 7. Segurança

- Toda rota que usa modelo exige o token interno. Token vem de variável de ambiente e o serviço não sobe sem ele.
- Valide tamanho e formato da imagem antes de processar; responda 422 com mensagem clara em vez de erro 500.

## 8. Honestidade

- `metrics` só recebe números medidos (do CSV de resultados). Sem medição, fica vazio e a tela mostra "Sem resultado registrado".
- Softmax de Oral e Cérebro não é probabilidade calibrada; só o modelo da Pele é calibrado.

## 9. Compatibilidade

Mudou um campo da resposta? Atualize os DTOs do backend no mesmo commit. Quer trocar um modelo em produção? Publique um id novo em vez de reaproveitar o antigo, porque o histórico guarda o id.
