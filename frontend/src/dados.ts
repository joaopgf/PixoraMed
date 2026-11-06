// Conclusões do grupo sobre cada dataset. Mostradas no painel e na página de limitações.

const AUMENTO_MULTI_CANCER =
  "O Multi Cancer foi aumentado (rotação, deslocamento, zoom, espelhamento e brilho). Variações da mesma imagem podem cair no treino e no teste.";

export const SUSPEITA_VAZAMENTO: Record<string, string> = {
  Oral: AUMENTO_MULTI_CANCER,
  "Cérebro": AUMENTO_MULTI_CANCER,
};

export const AVISO_ESCOPO: Record<string, string> = {
  "Cérebro":
    "Este módulo diferencia apenas glioma, meningioma e tumor hipofisário. Ele não detecta a ausência de tumor, não reconhece outros tipos e não indica se o tumor é benigno ou maligno.",
};

export const NOTAS_DATASET: Record<string, string> = {
  Pele: "Único dataset dividido por lesão (sem vazamento de lesão). F1 ~50% é o número honesto da CNN pequena de 7 classes, que não é o modelo usado no app.",
  "Cérebro": "Normalizado não convergiu em 450 épocas (underfitting); sem normalizar chegou a 95%. O modelo só separa tipos de tumor: não há classe sem tumor.",
  Oral: "Cinza sem normalização teve overfitting claro: treino ~99%, teste ~75%.",
};

export const formatarPct = (valor: number) => `${valor.toFixed(2).replace(".", ",")}%`;
