// Em desenvolvimento fica vazio e o Vite repassa /api ao backend; na Vercel aponta para a API no Render
const BASE = import.meta.env.VITE_API_URL ?? "";

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
  metricas: Partial<Record<"acc_media" | "acc_desvio" | "f1_media" | "f1_desvio", number>>;
};

export type ResultadoPrevisao = {
  modelo_id: string;
  cancer: string;
  classe_prevista: string;
  confianca: number;
  probabilidades: { classe: string; probabilidade: number }[];
  tempo_ms: number;
  aviso: string;
};

async function pedir<T>(caminho: string, init?: RequestInit): Promise<T> {
  const resposta = await fetch(`${BASE}${caminho}`, init);
  if (!resposta.ok) {
    const corpo = await resposta.json().catch(() => null);
    throw new Error(corpo?.detail ?? `Erro ${resposta.status} ao acessar a API`);
  }
  return resposta.json() as Promise<T>;
}

export const api = {
  treinos: () => pedir<Treino[]>("/api/treinos"),
  modelos: () => pedir<Modelo[]>("/api/modelos"),
  prever: (modeloId: string, arquivo: File) => {
    const form = new FormData();
    form.append("modelo_id", modeloId);
    form.append("arquivo", arquivo);
    return pedir<ResultadoPrevisao>("/api/previsoes", { method: "POST", body: form });
  },
};
