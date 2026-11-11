---
name: frontend-architecture
description: Arquitetura do frontend React do PixoraMed (organização de pastas, fluxo de dados página → hook → api → apiClient, rotas, login e rota protegida, estado da análise, ligação com o backend pela Vercel, erros, acessibilidade e tamanho de fonte). Use antes de criar ou alterar telas, componentes, chamadas à API ou rotas.
---

# Arquitetura do frontend

## Papel no sistema

O frontend só apresenta dados e coleta a entrada do usuário. Toda regra de negócio (login, decisão da classe, histórico) está no backend. Ele roda na Vercel, separado do backend.

## Pastas e responsabilidades

| Pasta | Responsabilidade |
|---|---|
| `src/api/` | `apiClient.js` (único lugar com `fetch`: token, erro padronizado) e um arquivo por recurso (`authApi`, `predictionsApi`, `trainingsApi`) |
| `src/hooks/` | Consultas com cache do TanStack Query (`useModels`, `useTrainings`, `usePredictionHistory`) |
| `src/auth/` | `AuthContext` (token no navegador, usuário logado, logout) e `ProtectedRoute` |
| `src/context/` | `AnalysisContext`: análise em andamento e último resultado, só nesta aba |
| `src/pages/` | Uma tela por rota; junta hooks, contextos e componentes |
| `src/components/` | Peças visuais reutilizáveis; recebem dados por props e não chamam a API |
| `src/utils/` | Catálogo de módulos, textos dos datasets, formatação, `resultView` (interpretação do resultado) e `exportCsv` |
| `src/styles/` | Um arquivo por área (`base`, `shared`, `layout`, `landing`, `dashboard`, `upload`, `result`...), juntados por `index.css`; `responsive.css` fica por último porque sobrescreve os outros. Variáveis (`--font-size-*`, cores) no `base.css` |

## Fluxo de dados

```
page --> hook (useQuery) --> api/<recurso>.js --> apiClient.request --> /api no backend
page --> useMutation(api/<recurso>.js) para escritas (ex.: nova análise)
```

- Leitura passa por um hook de `hooks/`, para o cache ser compartilhado entre telas (mesma `queryKey`).
- Depois de uma escrita, invalide a consulta afetada (`invalidateQueries({ queryKey: ["predictions"] })`).
- Os dados da API chegam em camelCase e em inglês (`predictedClass: "malignant"`); a tradução para a tela fica em `utils/modules.js` (`className`, `modeName`).

## Componentes compartilhados

Antes de escrever marcação repetida numa página, use o componente que já existe:

| Componente | Para quê |
|---|---|
| `Panel` | Cartão com título, descrição e ações (`as="aside"` quando for lateral) |
| `InfoPair` | Linha rótulo e valor (`mono` para números) |
| `Toggle` | Alternância entre opções (ex.: Acurácia / F1 macro) |
| `QueryState` | Carregando, erro e lista vazia de uma consulta |
| `ImageDropzone` | Envio de imagem com validação de tipo e tamanho |
| `BarChartWithError`, `ProbabilityPieChart` | Gráficos (dados por props) |
| `LowConfidenceTag` | Etiqueta "baixa certeza" nas listas (regra em `utils/resultView.isLowConfidence`) |
| `common.jsx` | `PageHeader`, `Alert`, `Steps`, `TextLink` |

Lógica de interpretação para a tela fica em `utils/` (ex.: `buildResultView`), não dentro da página.

## Rotas

Definidas em `App.jsx`, em inglês e kebab-case: `/`, `/login` públicas; `/dashboard`, `/new-analysis`, `/analysis/:moduleId`, `/review`, `/result/:id`, `/history`, `/training-results`, `/models`, `/limitations`, `/account` dentro de `ProtectedRoute` + `Layout`.

As telas internas são importadas com `React.lazy` (cada uma vira um arquivo separado no build) e o `Suspense` fica dentro do `Layout`, em volta do `<Outlet />`. Página nova interna entra do mesmo jeito; só `Landing` e `Login` ficam no pacote principal.

## Login

- O backend devolve `{token, expiresAt, user}`. O `AuthContext` guarda no `sessionStorage` (ou `localStorage` com "manter conectado") e passa o token ao `apiClient`.
- Uma resposta 401 com token ativo faz logout automático com o aviso "sessão expirou".
- Não há rota de logout no backend: sair é apagar o token no navegador.

## Ligação com o backend

O site sempre chama `/api` no próprio domínio. No desenvolvimento, o Vite repassa para `BACKEND_URL`; na Vercel, o `vercel.json` faz o rewrite para o Render (com cache desligado em `/api`) e o fallback das rotas para o `index.html`. Não há URL do backend no código JavaScript.

## Erros e carregamento

- O `apiClient` transforma qualquer erro em `Error(message)`, com a mensagem que o backend mandou em `{"message": ...}`.
- Toda tela que consulta a API trata `isLoading` e `isError`. O ai-service pode levar ~1 minuto para acordar: mostre "Conectando..." em vez de erro imediato.

## Acessibilidade e fontes

- Tamanhos só pelas variáveis `--font-size-*` em `rem` (corpo 16 px, rótulos no mínimo 14 px). Não use `px` em `font-size`.
- Endereços `blob:` de prévia de imagem: crie fora de funções de atualização de estado e libere no cleanup de um `useEffect` (veja `AnalysisContext`), senão o navegador tenta carregar um arquivo já liberado.
- Gráficos: identidade nunca só por cor (legenda em texto com valores), `role="img"` com descrição completa. Exemplo: `components/ProbabilityPieChart.jsx`.
- Campos com `<label>`, botões com texto ou `aria-label`.

## Validação

- `npm run lint` (ESLint 9: regras recomendadas, hooks do React e recarregamento do Vite) e `npm run build`.
- Ainda falta (alvo): testes de componentes.
