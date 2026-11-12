// Catálogo dos módulos (tipos de câncer) e funções de exibição: nomes das classes, modos, datas e números.

// Os 3 tipos de câncer do projeto: HAM10000 (Pele) e Multi Cancer (Oral e Cérebro).
// "id" é igual ao campo "cancerType" dos modelos e dos treinos que vêm da API.
export const MODULES = [
  {
    id: "skin",
    name: "Pele",
    exam: "Dermatoscopia",
    area: "Dermatologia",
    description:
      "Lesões cutâneas: benigno ou maligno (melanoma e carcinoma basocelular).",
    icon: "skin",
  },
  {
    id: "oral",
    name: "Oral",
    exam: "Histopatologia",
    area: "Estomatologia",
    description: "Tecido oral: normal e carcinoma.",
    icon: "mouth",
  },
  {
    id: "brain",
    name: "Cérebro",
    exam: "Ressonância",
    area: "Neurologia",
    description: "Glioma, meningioma e tumor hipofisário.",
    icon: "brain",
  },
];

export const findModule = (id) => MODULES.find((module) => module.id === id);

export const modelsForModule = (module, models = []) =>
  models.filter((model) => model.cancerType === module.id);

// "oral_color" -> módulo Oral, modo color. Modelos fora do catálogo ficam sem módulo, mas o histórico mostra o id
export function parseModelId(modelId) {
  const match = modelId.match(/^(.+)_(color|gray)$/);
  return {
    module: findModule(match ? match[1] : modelId),
    mode: match?.[2],
  };
}

// Classes vêm da API com os ids do dataset; a tela mostra o nome em português.
// Nomes conferidos na descrição do Multi Cancer no Kaggle: oral_scc = Oral Squamous Cell Carcinoma,
// brain_menin = Meningioma, brain_tumor = Pituitary Tumor. Os ids continuam no modelo, na API e no banco
const CLASS_NAMES = {
  benign: "benigno",
  malignant: "maligno",
  inconclusive: "inconclusivo",
  scc: "carcinoma espinocelular",
  menin: "meningioma",
  tumor: "hipofisário",
};
export const className = (value) => CLASS_NAMES[value] ?? value;

// Classes malignas, que os gráficos mostram em vermelho: maligno (Pele) e carcinoma espinocelular (Oral).
// Cérebro fica de fora: o módulo não indica se o tumor é benigno ou maligno.
export const MALIGNANT_CLASSES = ["malignant", "scc"];

// Classe que o backend devolve quando a confiança fica abaixo do limiar (Oral e Cérebro)
export const INCONCLUSIVE_CLASS = "inconclusive";

export const modeName = (mode) =>
  mode === "color" ? "colorido" : mode === "gray" ? "tons de cinza" : "";

export const recordCode = (id) => `PXM-${String(id).padStart(6, "0")}`;

export function formatDate(iso) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function formatSize(bytes) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(2)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// Fração (0 a 1) em porcentagem com vírgula: 0.7947 -> "79,47". Sem o "%" para o CSV, que guarda só o número
export const percentNumber = (fraction, digits = 2) =>
  (fraction * 100).toFixed(digits).replace(".", ",");

// Fração (0 a 1) em texto: 0.7947 -> "79,47%"; com digits = 0, 0.18 -> "18%"
export const formatPercent = (fraction, digits = 2) =>
  `${percentNumber(fraction, digits)}%`;

// Duas iniciais do nome, para o avatar
export function initials(name) {
  const parts = name.trim().split(/\s+/);
  return (
    (
      (parts[0]?.[0] ?? "") +
      (parts.length > 1 ? parts[parts.length - 1][0] : "")
    ).toUpperCase() || "?"
  );
}
