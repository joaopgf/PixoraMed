# frontend

Site do PixoraMed em **React 19 + Vite** (JavaScript). Mostra as telas e chama a API em `/api`. Publicado na Vercel como projeto próprio, separado do backend.

## Estrutura de `src/`

```
api/        apiClient.js (fetch central: token, erros) + um arquivo por recurso (authApi, predictionsApi)
auth/       AuthContext (login guardado no navegador) e ProtectedRoute (telas que exigem login)
context/    AnalysisContext (análise em andamento e último resultado, só nesta aba)
hooks/      useApiData (consultas com cache do TanStack Query: modelos e histórico)
components/ peças visuais reutilizáveis (Layout, ProbabilityPieChart, Icon...)
pages/      uma tela por rota
utils/      catálogo de módulos, textos dos datasets e formatação
styles/     CSS em um arquivo por área (base, layout, landing, dashboard...), juntados na ordem certa por index.css;
            os tamanhos de fonte ficam em variáveis (--font-size-*) no base.css
```

Fluxo dos dados: **página → hook → serviço de `api/` → apiClient → backend**. Componentes recebem dados por props e não chamam a API.

## Rotas do site

`/` (início) · `/login` · `/dashboard` · `/new-analysis` · `/analysis/:moduleId` · `/review` · `/result/:id` · `/history` · `/models` · `/limitations` · `/account`

## Como o site fala com a API

O site sempre chama `/api/...` no próprio endereço:

- **Desenvolvimento:** o Vite repassa `/api` para `BACKEND_URL` (padrão `http://localhost:8080`), definido no `frontend/.env` ou pelo compose.
- **Produção:** o `vercel.json` faz um *rewrite* de `/api/:path*` para o backend no Render e manda as outras rotas para o `index.html` (SPA).

Por que o rewrite: o navegador só conversa com o domínio do site, então não há chamada entre domínios no navegador e um cookie de login, se for usado no futuro, continua no domínio do site (sem problema de cookie de terceiros). O cache da Vercel fica desligado em `/api` para nenhuma resposta logada ser guardada. O endereço do backend no `vercel.json` é público (`https://pixoramed.onrender.com`); se o serviço mudar de nome, atualize esse arquivo.

## Variáveis de ambiente

Veja [`.env.example`](.env.example). O site não usa nenhuma variável `VITE_*`: tudo que começa com `VITE_` entra no código público do navegador, então segredos nunca podem ir para lá.

## Rodando

```bash
cd frontend
npm ci
npm run dev       # http://localhost:5173 (precisa do backend rodando)
npm run lint      # ESLint (regras do JavaScript, dos hooks do React e do Vite)
npm run build     # gera dist/
```

## Acessibilidade e fontes

- Corpo do texto em 16 px e rótulos em no mínimo 14 px, definidos em variáveis no início de `styles/app.css`.
- O gráfico de pizza das probabilidades usa cores seguras para daltonismo, legenda em texto com a porcentagem de cada classe e uma descrição completa para leitores de tela. As classes malignas (`MALIGNANT_CLASSES` em `utils/modules.js`: maligno na Pele e carcinoma na Oral) ficam sempre em vermelho, e cada classe mantém a mesma cor em todas as análises. O Cérebro não tem vermelho, porque o módulo não indica se o tumor é benigno ou maligno.
