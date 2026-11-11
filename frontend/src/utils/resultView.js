// Prepara o que a tela de resultado mostra a partir da análise e do modelo usado.
// Não decide a classe (isso é do backend): só interpreta os valores que a API devolveu.

// data: análise atual ou registro do histórico · current: análise feita agora (tem os limiares) · model: modelo usado
export function buildResultView(data, current, model) {
  // Com limiar próprio (Pele), o que importa é a probabilidade da classe positiva, não a confiança da classe prevista
  const threshold = current?.threshold ?? model?.threshold ?? null;
  const positiveClass = model?.classes[1] ?? "malignant";
  const positiveProbability =
    data.predictedClass === positiveClass
      ? data.confidence
      : 1 - data.confidence;

  // Só em modelos com limiar próprio: a classe é mantida, e a tela avisa se nenhuma classe alcança o mínimo
  const lowConfidenceThreshold =
    current?.lowConfidenceThreshold ?? model?.lowConfidenceThreshold ?? null;
  const lowConfidence =
    threshold !== null &&
    lowConfidenceThreshold !== null &&
    Math.max(positiveProbability, 1 - positiveProbability) <
      lowConfidenceThreshold;

  const inconclusive = data.predictedClass === "inconclusive";
  const inconclusiveThreshold =
    current?.inconclusiveThreshold ?? model?.inconclusiveThreshold ?? null;
  const inconclusiveText = `Resultado inconclusivo: o modelo não atingiu a confiança mínima${
    inconclusiveThreshold !== null
      ? ` de ${Math.round(inconclusiveThreshold * 100)}%`
      : ""
  } para indicar uma classe nesta imagem.`;

  return {
    threshold,
    positiveClass,
    positiveProbability,
    lowConfidence,
    lowConfidenceThreshold,
    inconclusive,
    inconclusiveText,
  };
}

// Para listas (histórico e painel): o registro do banco tem só classe e confiança, e o modelo traz os limiares
export function isLowConfidence(record, models = []) {
  const model = models.find((item) => item.id === record.modelId);
  return model ? buildResultView(record, null, model).lowConfidence : false;
}
