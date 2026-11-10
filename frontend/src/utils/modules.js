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

// Classes vêm da API em inglês; a tela mostra em português.
// A pasta brain_tumor do dataset é de tumor hipofisário; o id "tumor" continua no modelo, na API e no banco
const CLASS_NAMES = {
  benign: "benigno",
  malignant: "maligno",
  inconclusive: "inconclusivo",
  tumor: "hipofisário",
};
export const className = (value) => CLASS_NAMES[value] ?? value;

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

export const formatPercent = (value) =>
  `${value.toFixed(2).replace(".", ",")}%`;
