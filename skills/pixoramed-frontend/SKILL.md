---
name: pixoramed-frontend
description: Crie a interface web do PixoraMed com React, Vite e TypeScript, incluindo rotas, fluxo de análise, telas de resultado e identidade visual. Use ao criar ou alterar páginas, componentes, estilos ou a integração com a API.
---

# Frontend

Stack: React 19, Vite 6, TypeScript 5 em modo estrito, React Router 7, TanStack Query 5 e Recharts 2. **Use CSS próprio** em `src/styles/app.css` e `extras.css`, sem Tailwind nem biblioteca de componentes. Toda a interface fica em português do Brasil.

Consulte `pixoramed-backend` para o contrato da API, `pixoramed-regras-do-produto` para as regras e `pixoramed-governanca` para os textos de limitação.

## Arquivos de base

`frontend/package.json`. Não acrescente `overrides` nem outras dependências sem necessidade, e confira com `npm ci`:

```json
{
  "name": "pixoramed-frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": { "dev": "vite", "build": "tsc -b && vite build", "preview": "vite preview" },
  "dependencies": {
    "@tanstack/react-query": "^5.62.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.1.0",
    "recharts": "^2.15.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "~5.7.2",
    "vite": "^6.0.0"
  }
}
```

`tsconfig.json`: `target` ES2022, `module` ESNext, `moduleResolution` bundler, `jsx` react-jsx, `strict`, `noUnusedLocals`, `noUnusedParameters`, `skipLibCheck`, `isolatedModules`, `noEmit` e `types: ["vite/client"]`, incluindo `src` e `vite.config.ts`. `index.html` usa `lang="pt-BR"`, o título `PixoraMed`, o ícone `/icone.svg` e carrega `/src/main.tsx`. `main.tsx` monta `QueryClientProvider`, `BrowserRouter` e `EstadoProvider`, com consultas `staleTime: 60_000` e `retry: 1`.

## Integração

- `src/api.ts`: tipos do contrato e `pedir()`, que lança `detail` da API como erro (no 422, uma mensagem por campo). A base é `import.meta.env.VITE_API_URL ?? ""`. `configurarSessao(token, aoExpirar)` guarda o token, que `pedir()` envia em `Authorization: Bearer`; um 401 com token chama `aoExpirar`. Inclui `api.cadastrar`, `api.entrar` e `api.sair`.
- `vite.config.ts`: repassa `/api` para `http://localhost:8000`.
- `api.treinos` filtra pelos nomes do catálogo. `api.previsoes` usa `?limite=100`; o Painel e o Histórico falam em "análises recentes". Use chaves de cache `modelos`, `treinos` e `previsoes`, e invalide `previsoes` depois de uma análise.

`src/modulos.ts`:

```ts
export const MODULOS = [
  { id: "pele", slug: "pele", nome: "Pele", exame: "Dermatoscopia", area: "Dermatologia", descricao: "Lesões cutâneas: benigno ou maligno (melanoma e carcinoma basocelular).", icone: "skin" },
  { id: "oral", slug: "oral", nome: "Oral", exame: "Histopatologia", area: "Estomatologia", descricao: "Tecido oral: normal e carcinoma.", icone: "mouth" },
  { id: "cerebro", slug: "cerebro", nome: "Cérebro", exame: "Ressonância", area: "Neurologia", descricao: "Glioma, meningioma e tumor hipofisário.", icone: "brain" },
];
const NOMES_CLASSES: Record<string, string> = { tumor: "hipofisário" };
export const nomeClasse = (classe: string) => NOMES_CLASSES[classe] ?? classe;
```

Inclua também:

- `obterModulo`: busca o módulo pelo id.
- `modelosDoModulo`: compara `modelo.cancer` com `modulo.nome`.
- `lerModeloId`: separa `oral_cor` em módulo e modo.
- `nomeModo`: `colorido` ou `tons de cinza`.
- `codigoRegistro`: `PXM-000001`.
- `formatarData`: a API grava em UTC sem fuso, então trate como UTC e use `pt-BR`.
- `formatarTamanho`, e `formatarPct` em `dados.ts`, com vírgula decimal.

Use `nomeClasse` em todas as telas, inclusive na busca e no CSV do histórico. O id `tumor` não muda na API.

## Estado: `src/estado.tsx`

`moduloPendente` guarda o módulo clicado na página pública antes do login, usado como destino depois de entrar. `codigoCaso` é opcional e digitado na tela Preparar, com `maxLength` 32 e o exemplo `CASO-001`. Contexto com `logado`, `usuario`, `entrar(sessao, manter)`, `sair`, `avisoLogin`, `moduloPendente`, `analise` (`moduloId`, `modeloId`, `codigoCaso`, `consentimento`, `arquivo`, `arquivoUrl`) e `ultimoResultado`. A sessão (`token`, `expira_em`, `usuario`) fica na chave `pixoramed_sessao`: no `localStorage` com "Manter conectado", senão no `sessionStorage`. Leia e configure o token **ao carregar o módulo**, antes da primeira consulta. Ao entrar e ao sair, limpe o cache do TanStack Query, para o histórico de uma conta não aparecer em outra. Se a API recusar o token, encerre a sessão e mostre "Sua sessão expirou. Entre novamente." no login. Libere as URLs de pré-visualização com `URL.revokeObjectURL`. Imagem, probabilidades e código do caso **ficam só na sessão**.

## Rotas: `src/App.tsx`

Públicas: `/` (`Publica`) e `/login` (`Login`). Dentro de `ExigeAcesso` e do layout `Estrutura`:

| Rota | Página | Conteúdo |
|---|---|---|
| `/painel` | `Painel` | Boas-vindas, 4 métricas, módulos, fluxo e atividade recente |
| `/nova` | `Catalogo` | Cartões dos módulos, com o status de conexão |
| `/analise/:moduloId` | `Preparar` | Modelo, imagem e consentimento |
| `/revisao` | `Revisao` | Resumo e botão "Executar análise" |
| `/resultado/:id` | `Resultado` | Resultado completo |
| `/historico` | `Historico` | Tabela, busca, filtro e exportação CSV |
| `/resultados` | `Resultados` | Gráficos e tabela dos treinos |
| `/modelos` | `Modelos` | Situação de cada módulo |
| `/limitacoes` | `Limitacoes` | Governança e créditos |
| `/conta` | `Conta` | Perfil ilustrativo e privacidade |

Qualquer outra rota redireciona para `/`. Volte ao topo a cada navegação.

**Barra lateral:** WORKSPACE (Visão geral, Nova análise, Histórico de análises), PROJETO (Resultados dos treinos, Módulos e modelos, Limitações e ética) e CONTA (Conta e segurança), com o cartão "Projeto acadêmico". No topo, a etiqueta "PROJETO ACADÊMICO" e o nome e o e-mail do usuário, com as iniciais no avatar (`iniciais()` em `Estrutura.tsx`). No celular, navegação inferior com Início, Nova análise, Histórico e Resultados.

## Telas principais

**Página pública:** cabeçalho com a marca e o botão de acesso; título "Análise inteligente de imagens médicas"; texto sobre módulos por tipo de exame e análise honesta dos números; botões "Acessar ambiente demonstrativo" e "Conhecer os módulos"; cartões dos três módulos; três passos (Escolha o exame, Envie a imagem, Revise a saída); créditos dos datasets e a frase "Projeto acadêmico de pesquisa aplicada (Bootcamp de IA TCS / SENAI).".

**Login:** abas "Entrar" e "Criar conta". Entrar: e-mail e senha. Criar conta: nome, e-mail, senha (mínimo 8) e confirmação, conferida no navegador ("As senhas não conferem."). Caixa "Manter conectado neste navegador". Mostre o erro da API e bloqueie o botão durante o envio. Depois de entrar, vá para `moduloPendente` ou `/painel`; quem já está logado é levado ao painel. Rodapé: não usar a mesma senha de outros serviços.

**Catálogo:** avise que a imagem precisa ser do módulo certo: "O modelo não verifica o tipo de exame: uma imagem de outro tipo também recebe um resultado."

**Preparar:** aceite PNG, JPG e WEBP até 10 MB, com arrastar e soltar e pré-visualização. Escolha um modelo automaticamente, preferindo `cor`. O botão "Revisar caso" fica bloqueado com a pendência visível: falta imagem, falta modelo ("Este módulo ainda não tem modelo conectado.") ou falta consentimento. O texto de consentimento confirma material autorizado e desidentificado.

**Resultado:** mostre o aviso "MODELO EXPERIMENTAL: ESTE RESULTADO NÃO É UM DIAGNÓSTICO", três cartões (classe ou resultado; probabilidade ou confiança; modelo, com modo e tempo), probabilidades, imagem da sessão, identificação e o espaço de explicabilidade como "Ainda não implementado". Em `/resultado/:id`, procure o registro em `api.previsoes`: `atual` é `ultimoResultado` quando o id coincide, `registro` vem do banco, `dados` é `atual ?? registro`, e `modeloUsado` vem de `api.modelos` pelo `modelo_id`. Sem nenhum deles, mostre "Registro não encontrado entre os 100 mais recentes.". Na página de revisão, navegue para o resultado sem apagar antes a análise da sessão. Use esta lógica:

```ts
const limiar = atual?.limiar ?? modeloUsado?.limiar ?? null;
const classePositiva = modeloUsado?.classes[1] ?? "maligno";
const probPositiva = dados.classe_prevista === classePositiva ? dados.confianca : 1 - dados.confianca;
const limiarCerteza = atual?.limiar_baixa_certeza ?? modeloUsado?.limiar_baixa_certeza ?? null;
const baixaCerteza = limiar !== null && limiarCerteza !== null && Math.max(probPositiva, 1 - probPositiva) < limiarCerteza;
const inconclusivo = dados.classe_prevista === "inconclusivo";
```

- Com limiar: cartão "Probabilidade estimada de maligno", com "Média calibrada de 5 modelos no dataset de treino. Não é o risco clínico deste paciente."
- Sem limiar: cartão "Confiança do modelo", com "Saída softmax da rede, não uma probabilidade calibrada de doença."
- `inconclusivo`: cartão "Resultado" com "Inconclusivo" e o texto "O sistema não indica uma classe quando a confiança fica abaixo do limiar.". A frase de `pixoramed-regras-do-produto` aparece uma vez, em um aviso abaixo dos cartões.
- `baixaCerteza`: a frase de baixa certeza, mantendo a classe.
- Cérebro: "O que este resultado não informa.", com o texto de `pixoramed-governanca`.
- Oral e Cérebro: aviso de métrica possivelmente inflada.
- Registro aberto do banco: em vez de imagem e probabilidades, explique que elas só existem logo após a análise e mostre "Imagem descartada".

**Histórico:** colunas Identificador, Módulo, Classe prevista, Confiança, Data e Ação. O CSV usa BOM e `;`, para abrir no Excel em português.

**Resultados:** alterne acurácia e F1 macro. Dois gráficos de barras (Recharts, eixo de 40 a 100%, barras de erro com a média dos desvios): "Cor x cinza", com um alternador entre "Normalizado (/255)" e "Sem normalizar", e "Efeito da normalização", só com as configurações rodadas das duas formas. Depois, a tabela "Todas as execuções" e as observações por dataset, com os textos de `NOTAS_DATASET` em `dados.ts`, definidos em `pixoramed-governanca`. **Nos gráficos, tire a média só de execuções da mesma configuração e sem variante**, para não misturar a CNN antiga com outros métodos. Deixe as variantes na tabela. A seção da reprodução da Pele é opcional: crie o componente `ReproducaoPele` só se o usuário fornecer a pasta de resultados. Copie os PNG para `public/resultados/pele/`, com os nomes de `pixoramed-treino-modelos`, e escreva as métricas de `metricas_teste.csv` como constantes. Um app React não consegue detectar arquivos, então não tente procurar a pasta em tempo de execução. A seção leva o aviso "Estes números não são do modelo pele_cor usado nas análises."

**Modelos:** para cada módulo, mostre o status e o pré-processamento, o limite do inconclusivo ou o limiar e "Sem resultado registrado" quando não houver métricas. Use a etiqueta `possível vazamento` em Oral e Cérebro.

**Painel:** métricas de módulos, modelos conectados, treinos registrados (do catálogo) e análises recentes, sempre dos dados reais da API, mais o bloco de fluxo com "Selecionar módulo", "Preparar o caso" e "Revisar o retorno" e as 3 análises mais recentes.

**Conta:** só o cartão do perfil, com nome, e-mail, data de criação e permissão ("Análises e histórico próprio") e o botão "Sair da conta". Os avisos de governança ficam na página Limitações.

**Status de conexão:** "Modelo conectado" e "Modelo não conectado".

## Identidade visual

```css
:root{--ink:#17344b;--ink2:#24475f;--muted:#6f8798;--soft:#8ca0ad;--blue:#247fa5;--blue2:#17698f;--cyan:#52cce7;--line:#e1ebf1;--line2:#d3e2eb;--bg:#f5f9fc;--white:#fff;--pale:#eaf5fa;--teal:#3ab8ad;--warning:#a8792a;--warning-bg:#fff8e9;--shadow:0 16px 45px rgba(45,112,145,.08);--radius:20px}
```

- Fonte Inter, com `Segoe UI` como alternativa. Fundo claro com gradiente suave azul.
- Marca: quadrado arredondado de 34 px com gradiente `#49c6df` a `#145b83`, letra "P" branca e o nome "PixoraMed" em negrito.
- Painéis brancos arredondados, com sombra suave. Avisos em âmbar com ícone.
- Ícones SVG próprios em `components/Icone.tsx`, por nome.
- Componentes comuns em `components/Estrutura.tsx`: `CabecalhoPagina`, `Alerta`, `Etapas` (Exame, Revisão e Resultado) e `LinkTexto`.
- Layout responsivo: em telas pequenas, a barra lateral dá lugar à navegação inferior.
- Mostre só os módulos do escopo. Não use imagens de órgãos fora de Pele, Oral e Cérebro.
- Prefira fontes legíveis no projetor. Evite textos de 8 a 11 px em conteúdo importante.

Na nuvem, o build do React vai dentro da imagem do backend e o FastAPI serve o site (veja `pixoramed-infraestrutura`). `VITE_API_URL` fica vazio, porque o site e a API estão no mesmo endereço.

## Verificação

Rode `npm run build`. Com a API ativa em um banco de teste, faça o fluxo completo em cada módulo, confira um caso `inconclusivo` e um com baixa certeza, abra um registro pelo histórico e teste a tela no celular.
