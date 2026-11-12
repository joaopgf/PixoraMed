// Conclusões do grupo sobre cada dataset, por tipo de câncer. Mostradas no resultado e nas limitações.

// Aviso em linguagem simples para o médico; o detalhe técnico (dataset aumentado, possível vazamento) fica na página de limitações
const MULTI_CANCER_AUGMENTATION =
  "Este módulo foi testado com imagens muito parecidas com as do treino. Em imagens de outros equipamentos ou hospitais, o resultado pode ser menos confiável.";

export const LEAKAGE_SUSPICION = {
  oral: MULTI_CANCER_AUGMENTATION,
  brain: MULTI_CANCER_AUGMENTATION,
};

export const SCOPE_WARNING = {
  brain:
    "Este módulo diferencia apenas glioma, meningioma e tumor hipofisário. Ele não detecta a ausência de tumor, não reconhece outros tipos e não indica se o tumor é benigno ou maligno.",
};

export const DATASET_NOTES = {
  skin: "Único dataset dividido por lesão (sem vazamento de lesão). F1 ~50% é o número honesto da CNN pequena de 7 classes, que não é o modelo usado no app.",
  brain:
    "Normalizado não convergiu em 450 épocas (underfitting); sem normalizar chegou a 95%. O modelo só separa tipos de tumor: não há classe sem tumor.",
  oral: "Cinza sem normalização teve overfitting claro: treino ~99%, teste ~75%.",
};
