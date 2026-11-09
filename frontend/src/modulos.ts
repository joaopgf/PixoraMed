import type { Modelo } from "./api";

export type Modulo = {
  id: string;
  /** Prefixo do id dos modelos: rim_cor, colo_do_utero_cinza... */
  slug: string;
  /** Igual ao campo "cancer" dos modelos e dos treinos */
  nome: string;
  exame: string;
  area: string;
  descricao: string;
  icone: string;
};

// Os 3 tipos de câncer do projeto: HAM10000 (Pele) e Multi Cancer (Oral e Cérebro)
export const MODULOS: Modulo[] = [
  {
    id: "pele",
    slug: "pele",
    nome: "Pele",
    exame: "Dermatoscopia",
    area: "Dermatologia",
    descricao:
      "Lesões cutâneas: benigno ou maligno (melanoma e carcinoma basocelular).",
    icone: "skin",
  },
  {
    id: "oral",
    slug: "oral",
    nome: "Oral",
    exame: "Histopatologia",
    area: "Estomatologia",
    descricao: "Tecido oral: normal e carcinoma.",
    icone: "mouth",
  },
  {
    id: "cerebro",
    slug: "cerebro",
    nome: "Cérebro",
    exame: "Ressonância",
    area: "Neurologia",
    descricao: "Glioma, meningioma e tumor hipofisário.",
    icone: "brain",
  },
];

export const obterModulo = (id: string | undefined) =>
  MODULOS.find((modulo) => modulo.id === id);

export const modelosDoModulo = (modulo: Modulo, modelos: Modelo[] = []) =>
  modelos.filter((modelo) => modelo.cancer === modulo.nome);

// "oral_cor" -> módulo Oral, modo cor. Modelos que saíram do catálogo ficam sem módulo, mas o histórico continua mostrando o id
export function lerModeloId(modeloId: string) {
  const encontrado = modeloId.match(/^(.+)_(cor|cinza)$/);
  const slug = encontrado ? encontrado[1] : modeloId;
  return {
    modulo: MODULOS.find((modulo) => modulo.slug === slug),
    modo: encontrado?.[2],
  };
}

// A pasta brain_tumor do dataset é de tumor hipofisário; o id "tumor" continua no modelo, na API e no banco
const NOMES_CLASSES: Record<string, string> = { tumor: "hipofisário" };
export const nomeClasse = (classe: string) => NOMES_CLASSES[classe] ?? classe;

export const nomeModo = (modo?: string) =>
  modo === "cor" ? "colorido" : modo === "cinza" ? "tons de cinza" : "";

export const codigoRegistro = (id: number) =>
  `PXM-${String(id).padStart(6, "0")}`;

// A API grava em UTC sem indicar o fuso
export function formatarData(iso: string) {
  const data = new Date(/[zZ]|[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso}Z`);
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(data);
}

export function formatarTamanho(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(2)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
