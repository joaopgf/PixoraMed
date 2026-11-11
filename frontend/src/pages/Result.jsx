// Etapa 3 da análise: resultado com a classe prevista, a confiança, as probabilidades e os avisos do modelo.
// Logo após a análise mostra tudo; registros antigos do histórico mostram só o que o banco guarda.
import { useNavigate, useParams } from "react-router-dom";

import { Alert, PageHeader, Steps } from "../components/common";
import Icon from "../components/Icon";
import InfoPair from "../components/InfoPair";
import Panel from "../components/Panel";
import ProbabilityPieChart from "../components/ProbabilityPieChart";
import { useAnalysis } from "../context/AnalysisContext";
import { useModels, usePredictionHistory } from "../hooks/useApiData";
import { LEAKAGE_SUSPICION, SCOPE_WARNING } from "../utils/datasetNotes";
import {
  MALIGNANT_CLASSES,
  className,
  formatDate,
  formatPercent,
  modeName,
  parseModelId,
  recordCode,
} from "../utils/modules";
import { buildResultView } from "../utils/resultView";

const DEFAULT_WARNING =
  "Resultado de um modelo experimental, feito para fins acadêmicos. Não é um diagnóstico e não substitui a avaliação de um profissional de saúde.";

export default function Result() {
  const navigate = useNavigate();
  const id = Number(useParams().id);
  const { lastResult } = useAnalysis();
  const current = lastResult?.id === id ? lastResult : null;

  // Registros antigos vêm do banco, que não guarda imagem nem probabilidades
  const history = usePredictionHistory();
  const models = useModels();
  const record = current ? null : history.data?.find((item) => item.id === id);

  const data = current ?? record;
  if (!data) {
    return (
      <>
        <PageHeader label="DETALHE DA ANÁLISE" title="Resultado da análise" description={`Registro ${recordCode(id || 0)}`} />
        <div className="panel empty">
          {history.isLoading
            ? "Carregando..."
            : history.isError
              ? history.error.message
              : "Registro não encontrado entre os 100 mais recentes."}
        </div>
      </>
    );
  }

  const { module, mode } = parseModelId(data.modelId);
  const moduleName = module?.name ?? data.modelId;
  const usedModel = models.data?.find((model) => model.id === data.modelId);
  const metrics = usedModel?.metrics;
  const leakage = module && LEAKAGE_SUSPICION[module.id];
  const {
    threshold,
    positiveClass,
    positiveProbability,
    lowConfidence,
    lowConfidenceThreshold,
    inconclusive,
    inconclusiveText,
  } = buildResultView(data, current, usedModel);

  return (
    <>
      <PageHeader
        label="DETALHE DA ANÁLISE"
        title="Resultado da análise"
        description={`Registro ${recordCode(data.id)}: ${moduleName}.`}
        actions={
          <button type="button" className="btn secondary" onClick={() => navigate("/history")}>
            <Icon name="clock" /> Histórico
          </button>
        }
      />
      {current && <Steps current={3} />}

      <div className="result-banner">
        <Icon name="info" />
        <div>
          <strong>MODELO EXPERIMENTAL: ESTE RESULTADO NÃO É UM DIAGNÓSTICO</strong>
          <p>{current?.warning ?? DEFAULT_WARNING}</p>
        </div>
      </div>

      <div className="result-grid">
        <article className="result-metric">
          <small>{inconclusive ? "Resultado" : "Classe prevista"}</small>
          <strong>{inconclusive ? "Inconclusivo" : className(data.predictedClass)}</strong>
          <p>
            {inconclusive
              ? "O sistema não indica uma classe quando a confiança fica abaixo do limiar."
              : threshold !== null
                ? `Vira "${className(positiveClass)}" quando a probabilidade alcança o limiar de ${formatPercent(threshold * 100)}, mesmo abaixo de 50%.`
                : "A classe mais provável entre as classes usadas no treino."}
          </p>
        </article>
        {threshold !== null ? (
          <article className="result-metric">
            <small>Probabilidade estimada de {className(positiveClass)}</small>
            <strong className="mono">{formatPercent(positiveProbability * 100)}</strong>
            <p>Média calibrada de 5 modelos no dataset de treino. Não é o risco clínico deste paciente.</p>
          </article>
        ) : (
          <article className="result-metric">
            <small>Confiança do modelo</small>
            <strong className="mono">{formatPercent(data.confidence * 100)}</strong>
            <p>Saída softmax da rede, não uma probabilidade calibrada de doença.</p>
          </article>
        )}
        <article className="result-metric">
          <small>Modelo</small>
          <strong>{data.modelId}</strong>
          <p>
            {modeName(mode)} · executado em {data.timeMs.toFixed(0)} ms
          </p>
        </article>
      </div>

      {inconclusive && (
        <div style={{ marginBottom: 15 }}>
          <Alert icon="warning">
            <strong>{inconclusiveText}</strong>
          </Alert>
        </div>
      )}

      {lowConfidence && (
        <div style={{ marginBottom: 15 }}>
          <Alert icon="warning">
            <strong>
              Baixa certeza: nenhuma classe atingiu {Math.round(lowConfidenceThreshold * 100)}% de probabilidade.
            </strong>
            <br />O resultado "{className(data.predictedClass)}" indica um caso suspeito pelo limiar de{" "}
            {Math.round(threshold * 100)}%, não uma confirmação.
          </Alert>
        </div>
      )}

      {module && SCOPE_WARNING[module.id] && (
        <div style={{ marginBottom: 15 }}>
          <Alert icon="warning">
            <strong>O que este resultado não informa.</strong>
            <br />
            {SCOPE_WARNING[module.id]}
          </Alert>
        </div>
      )}

      {leakage && (
        <div style={{ marginBottom: 15 }}>
          <Alert icon="warning">
            <strong>Métrica possivelmente inflada neste módulo.</strong>
            <br />
            {leakage}
          </Alert>
        </div>
      )}

      <div className="result-placeholder">
        <div className="placeholder-box">
          <h4>Probabilidade por classe</h4>
          {current ? (
            <ProbabilityPieChart
              probabilities={current.probabilities}
              predictedClass={current.predictedClass}
              alertClasses={MALIGNANT_CLASSES}
              formatName={className}
              formatValue={(value) => formatPercent(value * 100)}
            />
          ) : (
            <p>Disponível só logo após a análise. O histórico guarda apenas a classe prevista e a confiança.</p>
          )}
        </div>
        <div className="placeholder-box">
          <h4>Imagem analisada</h4>
          <p>{current ? current.fileName : "A imagem não fica guardada depois da análise."}</p>
          {current?.fileUrl ? (
            <img className="result-preview-image" src={current.fileUrl} alt="Imagem enviada para a análise" />
          ) : (
            <div className="placeholder-graphic">Imagem descartada</div>
          )}
        </div>
      </div>

      <Panel title="Identificação" description="Metadados da análise" style={{ marginTop: 15 }}>
        <InfoPair label="Identificador">{recordCode(data.id)}</InfoPair>
        {current?.caseCode && (
          <InfoPair label="Código do caso">{current.caseCode}</InfoPair>
        )}
        <InfoPair label="Módulo">{moduleName}</InfoPair>
        <InfoPair label="Data">{formatDate(data.createdAt)}</InfoPair>
        {metrics?.accuracyMean != null && (
          <InfoPair label="Desempenho na validação (5 folds)" mono>Acurácia {formatPercent(metrics.accuracyMean)}
              {metrics.f1Mean != null && ` · F1 ${formatPercent(metrics.f1Mean)}`}</InfoPair>
        )}
      </Panel>

      <div className="placeholder-box" style={{ marginTop: 15, minHeight: 0 }}>
        <h4>Explicabilidade / mapa de atenção</h4>
        <p>Ainda não implementado. Este espaço é reservado para o Grad-CAM, caso o grupo decida incluir.</p>
      </div>

      <div style={{ marginTop: 15 }}>
        <Alert type="info" icon="shield">
          <strong>Revisão profissional obrigatória.</strong>
          <br />
          Qualquer uso real exigiria validação clínica, controle de qualidade da
          imagem e trilha de auditoria. Veja também a página de limitações.
        </Alert>
      </div>

      <div className="head-actions" style={{ marginTop: 17 }}>
        <button type="button" className="btn primary" onClick={() => navigate("/new-analysis")}>
          Iniciar outra análise <Icon name="arrow" />
        </button>
        <button type="button" className="btn secondary" onClick={() => navigate("/limitations")}>
          Ver limitações
        </button>
      </div>
    </>
  );
}
