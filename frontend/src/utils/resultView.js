// Prepara o que a tela de resultado mostra a partir da análise e do modelo usado.
// Não decide a classe (isso é do backend): só interpreta os valores que a API devolveu.
import {
  className,
  formatPercent,
  INCONCLUSIVE_CLASS,
  MALIGNANT_CLASSES,
} from "./modules";

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

  const inconclusive = data.predictedClass === INCONCLUSIVE_CLASS;
  const inconclusiveThreshold =
    current?.inconclusiveThreshold ?? model?.inconclusiveThreshold ?? null;
  const inconclusiveText = `Resultado inconclusivo: o modelo não atingiu a confiança mínima${
    inconclusiveThreshold !== null
      ? ` de ${formatPercent(inconclusiveThreshold, 0)}`
      : ""
  } para indicar uma classe nesta imagem.`;

  // Explicação do limiar (Pele) em linguagem simples, conforme o caso foi ou não marcado como suspeito
  const positiveName = className(positiveClass);
  const limit = threshold !== null ? formatPercent(threshold, 0) : "";
  const thresholdText =
    threshold === null
      ? null
      : data.predictedClass === positiveClass
        ? `A chance estimada de ${positiveName} chegou a ${limit} ou mais. O sistema já marca o caso como suspeito a partir desse ponto, para não deixar passar um câncer.`
        : `A chance estimada de ${positiveName} ficou abaixo de ${limit}, o ponto a partir do qual o sistema marcaria o caso como suspeito.`;

  return {
    threshold,
    thresholdText,
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

// Resumo do histórico do usuário para os cards: total, suspeitas de câncer, inconclusivas e baixa certeza
export function summarizeHistory(records = [], models = []) {
  return {
    total: records.length,
    malignant: records.filter((record) =>
      MALIGNANT_CLASSES.includes(record.predictedClass),
    ).length,
    inconclusive: records.filter(
      (record) => record.predictedClass === INCONCLUSIVE_CLASS,
    ).length,
    lowConfidence: records.filter((record) => isLowConfidence(record, models))
      .length,
  };
}
