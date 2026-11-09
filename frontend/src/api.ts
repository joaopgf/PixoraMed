import { MODULOS } from "./modulos";

// Fica vazio: em desenvolvimento o Vite repassa /api ao backend e, na nuvem, o site e a API estão no mesmo endereço
const BASE = import.meta.env.VITE_API_URL ?? "";
const NOMES_MODULOS = new Set(MODULOS.map((modulo) => modulo.nome));

export type Treino = {
  id: number;
  data_hora: string;
  dataset: string;
  cancer: string;
  variante: string;
  modo: "cor" | "cinza";
  normalizado: boolean;
  imagens_total: number;
  imagens_por_classe: string;
  tamanho: string;
  epocas: number;
  batch: number;
  lr: number;
  folds: string;
  gpu: string;
  tempo_total: string;
  tempo_segundos: number;
  acc_media: number;
  acc_desvio: number;
  f1_media: number;
  f1_desvio: number;
  acc_por_fold: string;
  f1_por_fold: string;
};

export type Modelo = {
  id: string;
  cancer: string;
  modo: "cor" | "cinza";
  tamanho: number;
  normalizado: boolean;
  classes: string[];
  descricao: string;
  metricas: Partial<
    Record<"acc_media" | "acc_desvio" | "f1_media" | "f1_desvio", number>
  >;
  limiar: number | null;
  limiar_inconclusivo: number | null;
  limiar_baixa_certeza: number | null;
};

export type ResultadoPrevisao = {
  id: number;
  modelo_id: string;
  cancer: string;
  classe_prevista: string;
  confianca: number;
  probabilidades: { classe: string; probabilidade: number }[];
  limiar: number | null;
  limiar_inconclusivo: number | null;
  limiar_baixa_certeza: number | null;
  tempo_ms: number;
  aviso: string;
};

export type RegistroPrevisao = {
  id: number;
  criado_em: string;
  modelo_id: string;
  classe_prevista: string;
  confianca: number;
  tempo_ms: number;
};

export type Usuario = {
  id: number;
  nome: string;
  email: string;
  criado_em: string;
};

export type SessaoLogin = {
  token: string;
  expira_em: string;
  usuario: Usuario;
};

// O token da sessão fica aqui para todas as chamadas; quem guarda e apaga é o estado (estado.tsx)
let tokenAtual: string | null = null;
let aoPerderSessao: (() => void) | null = null;

export function configurarSessao(
  token: string | null,
  quandoExpirar: (() => void) | null,
) {
  tokenAtual = token;
  aoPerderSessao = quandoExpirar;
}

// O 422 do FastAPI traz uma lista de erros; a tela mostra só o primeiro, em texto
function mensagemDeErro(corpo: unknown, status: number): string {
  const detalhe = (corpo as { detail?: unknown } | null)?.detail;
  if (typeof detalhe === "string") return detalhe;
  if (Array.isArray(detalhe) && detalhe.length) {
    const campo = String(detalhe[0]?.loc?.at(-1) ?? "");
    return MENSAGENS_CAMPO[campo] ?? "Dados inválidos. Confira os campos.";
  }
  return `Erro ${status} ao acessar a API`;
}

const MENSAGENS_CAMPO: Record<string, string> = {
  nome: "Informe o nome, com pelo menos 2 letras.",
  email: "Informe um e-mail válido.",
  senha: "A senha precisa ter de 8 a 128 caracteres.",
};

async function pedir<T>(caminho: string, init: RequestInit = {}): Promise<T> {
  const cabecalhos = new Headers(init.headers);
  if (tokenAtual) cabecalhos.set("Authorization", `Bearer ${tokenAtual}`);
  const resposta = await fetch(`${BASE}${caminho}`, {
    ...init,
    headers: cabecalhos,
  });
  if (!resposta.ok) {
    const corpo = await resposta.json().catch(() => null);
    // Sessão vencida ou apagada no servidor: volta para o login
    if (resposta.status === 401 && tokenAtual) aoPerderSessao?.();
    throw new Error(mensagemDeErro(corpo, resposta.status));
  }
  if (resposta.status === 204) return undefined as T;
  return resposta.json() as Promise<T>;
}

const json = (corpo: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(corpo),
});

export const api = {
  // O resultados.csv tem todos os treinos do projeto; o app mostra só os módulos do catálogo
  treinos: async () =>
    (await pedir<Treino[]>("/api/treinos")).filter((treino) =>
      NOMES_MODULOS.has(treino.cancer),
    ),
  modelos: () => pedir<Modelo[]>("/api/modelos"),
  previsoes: () => pedir<RegistroPrevisao[]>("/api/previsoes?limite=100"),
  prever: (modeloId: string, arquivo: File) => {
    const form = new FormData();
    form.append("modelo_id", modeloId);
    form.append("arquivo", arquivo);
    return pedir<ResultadoPrevisao>("/api/previsoes", {
      method: "POST",
      body: form,
    });
  },
  cadastrar: (nome: string, email: string, senha: string) =>
    pedir<SessaoLogin>("/api/auth/cadastro", json({ nome, email, senha })),
  entrar: (email: string, senha: string) =>
    pedir<SessaoLogin>("/api/auth/login", json({ email, senha })),
  sair: () => pedir<void>("/api/auth/sair", { method: "POST" }),
};
