// Situação técnica de cada módulo: modelos carregados pela IA, pré-processamento, limiares e métricas.
import { useNavigate } from "react-router-dom";

import { Alert, PageHeader } from "../components/common";
import Icon from "../components/Icon";
import { useModels } from "../hooks/useApiData";
import { LEAKAGE_SUSPICION } from "../utils/datasetNotes";
import { formatPercent, modeName, MODULES, modelsForModule } from "../utils/modules";
import Panel from "../components/Panel";

const CHECKLIST = [
  { title: "Contrato da API", text: "Formato de entrada, validação do arquivo e erros (feito em /api/predictions)." },
  { title: "Pré-processamento", text: "Tamanho, cor e escala iguais aos do treino (lidos do .json de cada modelo)." },
  {
    title: "Modelo versionado",
    text: "Pesos em ONNX, com classes e métricas no .json. Falta registrar o dataset e a versão.",
  },
  {
    title: "Validação e monitoramento",
    text: "Validação clínica, desempenho por subgrupo e monitoramento: fora do escopo do projeto.",
  },
];

export default function Models() {
  const navigate = useNavigate();
  const models = useModels();

  return (
    <>
      <PageHeader
        label="GESTÃO TÉCNICA"
        title="Módulos e modelos"
        description="Situação de cada módulo: quais modelos a API carregou e como foram avaliados."
        actions={
          <button type="button" className="btn secondary" onClick={() => navigate("/new-analysis")}>
            Abrir catálogo
          </button>
        }
      />
      <div style={{ marginBottom: 16 }}>
        <Alert type="info" icon="activity">
          <strong>Um modelo especializado por tipo de exame.</strong>
          <br />
          Oral e Cérebro: CNN em PyTorch (3 blocos convolucionais, ~24 mil
          parâmetros). Pele: ensemble de 5 EfficientNet-B0 (~20 milhões de
          parâmetros no total). Todos exportados para ONNX e executados na CPU
          pelo microsserviço de IA.
        </Alert>
      </div>
      {models.isError && (
        <div style={{ marginBottom: 16 }}>
          <Alert>Não foi possível falar com a API: {models.error.message}</Alert>
        </div>
      )}

      <div className="model-grid">
        {MODULES.map((module) => {
          const list = modelsForModule(module, models.data);
          return (
            <article key={module.id} className="model-card">
              <div className="model-card-top">
                <span className="module-icon">
                  <Icon name={module.icon} />
                </span>
                <span className={`model-status${list.length ? " on" : ""}`}>
                  {models.isLoading ? "Conectando..." : list.length ? "Conectado" : "Não conectado"}
                </span>
              </div>
              <h3>
                {module.name}
                {LEAKAGE_SUSPICION[module.id] && (
                  <span className="tag-warn" title={LEAKAGE_SUSPICION[module.id]}>
                    vazamento
                  </span>
                )}
              </h3>
              <p>
                {module.description} Exame: {module.exam}.
              </p>
              {!list.length && (
                <div className="model-spec">
                  <span>Modelo</span>
                  <strong>Ainda não salvo</strong>
                </div>
              )}
              {list.map((model) => (
                <div key={model.id}>
                  <div className="model-spec">
                    <span>Modelo</span>
                    <strong>{model.id}</strong>
                  </div>
                  <div className="model-spec">
                    <span>Pré-processamento</span>
                    <strong>
                      {model.size}×{model.size}, {modeName(model.mode)},{" "}
                      {model.normalized ? "normalizado" : "sem normalizar"}
                    </strong>
                  </div>
                  {model.inconclusiveThreshold !== null && (
                    <div className="model-spec">
                      <span>Inconclusivo abaixo de</span>
                      <strong>{Math.round(model.inconclusiveThreshold * 100)}% de confiança</strong>
                    </div>
                  )}
                  {model.threshold !== null && (
                    <div className="model-spec">
                      <span>Limiar de decisão</span>
                      <strong>{formatPercent(model.threshold * 100)}</strong>
                    </div>
                  )}
                  <div className="model-spec">
                    <span>Validação (5 folds)</span>
                    <strong>
                      {model.metrics?.accuracyMean != null
                        ? `Acurácia ${formatPercent(model.metrics.accuracyMean)} ± ${(model.metrics.accuracyStd ?? 0).toFixed(2)}`
                        : "Sem resultado registrado"}
                    </strong>
                  </div>
                </div>
              ))}
            </article>
          );
        })}
      </div>

      <Panel
        title="Checklist de integração"
        description="Itens técnicos para cada modelo."
        style={{ marginTop: 16 }}
      >
        <div className="workflow" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))" }}>
          {CHECKLIST.map((item, i) => (
            <div key={item.title} className="workflow-step">
              <span className="step-num">{i + 1}</span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}
