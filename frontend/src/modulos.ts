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

// Os 9 datasets treinados no projeto (Multi Cancer e HAM10000)
export const MODULOS: Modulo[] = [
  { id: "pele", slug: "pele", nome: "Pele", exame: "Dermatoscopia", area: "Dermatologia", descricao: "Lesões cutâneas (HAM10000).", icone: "skin" },
  { id: "mama", slug: "mama", nome: "Mama", exame: "Mamografia", area: "Mastologia", descricao: "Imagens mamárias: benigno e maligno.", icone: "breast" },
  { id: "pulmao", slug: "pulmao", nome: "Pulmão", exame: "Histopatologia", area: "Tórax", descricao: "Lâminas de tecido pulmonar.", icone: "lungs" },
  { id: "cerebro", slug: "cerebro", nome: "Cérebro", exame: "Ressonância", area: "Neurologia", descricao: "Glioma, meningioma e tumor.", icone: "brain" },
  { id: "rim", slug: "rim", nome: "Rim", exame: "Tomografia", area: "Urologia", descricao: "Imagens renais: normal e tumor.", icone: "kidney" },
  { id: "colo-do-utero", slug: "colo_do_utero", nome: "Colo do útero", exame: "Citologia", area: "Ginecologia", descricao: "Células cervicais em lâmina.", icone: "uterus" },
  { id: "colon", slug: "colon", nome: "Cólon", exame: "Histopatologia", area: "Gastroenterologia", descricao: "Lâminas de tecido do cólon.", icone: "intestine" },
  { id: "linfoma", slug: "linfoma", nome: "Linfoma", exame: "Histopatologia", area: "Hematologia", descricao: "Subtipos CLL, FL e MCL.", icone: "lymph" },
  { id: "oral", slug: "oral", nome: "Oral", exame: "Histopatologia", area: "Estomatologia", descricao: "Tecido oral: normal e carcinoma.", icone: "mouth" },
];

export const obterModulo = (id: string | undefined) => MODULOS.find((modulo) => modulo.id === id);

export const modelosDoModulo = (modulo: Modulo, modelos: Modelo[] = []) =>
  modelos.filter((modelo) => modelo.cancer === modulo.nome);

// "colo_do_utero_cor" -> módulo Colo do útero, modo cor. Vale também para modelos que saíram da pasta models/
export function lerModeloId(modeloId: string) {
  const encontrado = modeloId.match(/^(.+)_(cor|cinza)$/);
  const slug = encontrado ? encontrado[1] : modeloId;
  return { modulo: MODULOS.find((modulo) => modulo.slug === slug), modo: encontrado?.[2] };
}

export const nomeModo = (modo?: string) => (modo === "cor" ? "colorido" : modo === "cinza" ? "tons de cinza" : "");

export const codigoRegistro = (id: number) => `PXM-${String(id).padStart(6, "0")}`;

// A API grava em UTC sem indicar o fuso
export function formatarData(iso: string) {
  const data = new Date(/[zZ]|[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso}Z`);
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(data);
}

export function formatarTamanho(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
