---
name: frontend-best-practices
description: Boas práticas arquiteturais do React no PixoraMed (componentes de apresentação x páginas, estado no lugar certo, reuso por hooks, nada de regra de negócio nem segredo no navegador, avisos obrigatórios da tela). Use ao planejar uma tela nova ou revisar uma mudança no frontend.
---

# Boas práticas de arquitetura do frontend

## 1. Página monta, componente mostra

- A página (`pages/`) busca os dados (hooks), lê os contextos e decide o que exibir.
- O componente (`components/`) recebe tudo por props e só desenha. Ele não chama a API nem lê o contexto da análise. Assim pode ser reutilizado e testado sozinho.

## 2. Estado no lugar certo

| Tipo de estado | Onde fica |
|---|---|
| Dados do servidor (modelos, treinos, histórico) | TanStack Query, via `hooks/` |
| Login | `AuthContext` |
| Análise em andamento (imagem, consentimento, último resultado) | `AnalysisContext` (só na memória da aba) |
| Estado de um formulário ou filtro | `useState` na própria página |

Não copie dados do servidor para um `useState`; leia do hook.

## 3. Reuso por hooks e utils

- Uma consulta usada em mais de uma tela vira hook em `hooks/useApiData.js`.
- Tradução e formatação para a tela (`className`, `formatPercent`) ficam em `utils/`, nunca repetidas nas páginas.

## 4. Sem regra de negócio no navegador

A classe final, o inconclusivo e os limiares vêm prontos do backend (`predictedClass`, `inconclusiveThreshold`, `lowConfidenceThreshold`). O frontend só exibe. Se precisar de um número novo, ele deve vir da API.

## 5. Sem segredo no bundle

Tudo que está no JavaScript é público. Não use variáveis `VITE_*` para segredo e não coloque URL de serviço interno no código: o site chama só `/api`.

## 6. Uma porta para a API

Todo `fetch` passa pelo `apiClient`. Ele coloca o token, padroniza o erro e trata o 401. Um serviço novo de `api/` só descreve a rota e o corpo.

## 7. Privacidade

- A imagem fica só na memória da aba (`URL.createObjectURL`) e é liberada ao trocar de análise ou sair.
- O código do caso não vai para o backend.

## 8. Textos e avisos obrigatórios

- Os textos da tela ficam em português; o código, em inglês.
- Toda tela de resultado mostra que o modelo é experimental e não faz diagnóstico, os avisos de vazamento (Oral e Cérebro) e de escopo (Cérebro).
- Nunca invente métricas: sem valor no modelo, mostre "Sem resultado registrado".

## 9. Mudanças de contrato

Rota ou campo novo no backend exige mudar `src/api` e as páginas no mesmo commit. Confira com uma busca que nenhum nome antigo sobrou.
