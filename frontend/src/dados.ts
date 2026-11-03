// Conclusões do grupo sobre cada dataset (resumo_2, seção 7). Mostradas no painel e na página de limitações.

export const SUSPEITA_VAZAMENTO: Record<string, string> = {
  Rim: "Provavelmente fatias quase iguais do mesmo paciente (tomografia) caem no treino e no teste.",
  "Pulmão": "LC25000: 1.250 imagens originais aumentadas para 25.000; cópias da mesma imagem caem no treino e no teste.",
  "Cólon": "LC25000: 1.250 imagens originais aumentadas para 25.000; cópias da mesma imagem caem no treino e no teste.",
  "Colo do útero": "Várias imagens recortadas da mesma lâmina caem no treino e no teste.",
};

export const NOTAS_DATASET: Record<string, string> = {
  Pele: "Único dataset dividido por lesão (sem vazamento). F1 ~50% é o número honesto da CNN pequena.",
  "Cérebro": "Normalizado não convergiu em 450 épocas (underfitting); sem normalizar chegou a 95%.",
  Oral: "Cinza sem normalização teve overfitting claro: treino ~99%, teste ~75%.",
};

export const formatarPct = (valor: number) => `${valor.toFixed(2).replace(".", ",")}%`;
