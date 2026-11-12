// Painel inicial depois do login: boas-vindas, acesso rápido aos módulos, fluxo de trabalho e atividade recente.
import { useNavigate } from "react-router-dom";

import { PageHeader, TextLink } from "../components/common";
import Icon from "../components/Icon";
import LowConfidenceTag from "../components/LowConfidenceTag";
import QueryState from "../components/QueryState";
import { useModels, usePredictionHistory } from "../hooks/useApiData";
import {
  className,
  formatDate,
  formatPercent,
  MODULES,
  parseModelId,
  recordCode,
} from "../utils/modules";
import { isLowConfidence } from "../utils/resultView";
import Panel from "../components/Panel";

const WORKFLOW = [
  {
    title: "Selecionar módulo",
    text: "Escolher o módulo compatível com a imagem.",
  },
  {
    title: "Preparar o caso",
    text: "Anexar a imagem e conferir o modelo que será usado.",
  },
  {
    title: "Revisar o retorno",
    text: "Consultar a classe prevista, as probabilidades e as limitações.",
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const models = useModels();
  const predictions = usePredictionHistory();

  return (
    <>
      <PageHeader
        label="VISÃO GERAL"
        title="Painel de trabalho"
        description="Acompanhe o ambiente, acesse módulos e inicie uma nova análise."
      />

      <section className="welcome-panel">
        <div className="welcome-copy">
          <div className="eyebrow">ESPAÇO DE TRABALHO</div>
          <h2>Bem-vindo à PixoraMed.</h2>
          <p>
            Analise imagens com os modelos treinados pelo grupo, acompanhe o
            histórico e compare os resultados dos treinos em um único ambiente.
          </p>
          <button
            type="button"
            className="btn primary"
            onClick={() => navigate("/new-analysis")}
          >
            <Icon name="plusfile" /> Nova análise
          </button>
        </div>
        <div className="welcome-art">
          <img
            src="/organs/brain.webp"
            alt="Visualização ilustrativa de cérebro holográfico"
          />
        </div>
      </section>

      <div className="dash-grid">
        <Panel
          title="Acesso rápido aos módulos"
          description="Selecione a área para iniciar uma análise."
          actions={<TextLink to="/new-analysis">Ver todos →</TextLink>}
        >
          <div className="quick-grid">
            {MODULES.map((module) => (
              <button
                key={module.id}
                type="button"
                className="quick-card"
                onClick={() => navigate(`/analysis/${module.id}`)}
              >
                <span className="module-icon">
                  <Icon name={module.icon} />
                </span>
                <strong>{module.name}</strong>
                <small>{module.exam}</small>
              </button>
            ))}
          </div>
        </Panel>

        <Panel
          title="Fluxo de trabalho"
          description="Etapas de uma análise"
          as="aside"
        >
          <div className="workflow">
            {WORKFLOW.map((step, i) => (
              <div key={step.title} style={{ display: "contents" }}>
                {i > 0 && <div className="workflow-line" />}
                <div className="workflow-step">
                  <span className="step-num">{i + 1}</span>
                  <div>
                    <strong>{step.title}</strong>
                    <p>{step.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel
        title="Atividade recente"
        description="Últimas previsões registradas no banco."
        style={{ marginTop: 16 }}
        actions={<TextLink to="/history">Abrir histórico →</TextLink>}
      >
        <QueryState
          query={predictions}
          emptyText="Nenhuma análise feita ainda."
        />
        <div className="activity-list">
          {predictions.data?.slice(0, 3).map((record) => {
            const { module } = parseModelId(record.modelId);
            return (
              <div key={record.id} className="activity-row">
                <div className="activity-main">
                  <span className="activity-symbol">
                    <Icon name={module?.icon ?? "image"} />
                  </span>
                  <div>
                    <strong>
                      {module?.name ?? record.modelId} · {recordCode(record.id)}
                    </strong>
                    <small>{formatDate(record.createdAt)}</small>
                  </div>
                </div>
                <div className="activity-state">
                  <strong>
                    {className(record.predictedClass)}
                    {isLowConfidence(record, models.data) && (
                      <LowConfidenceTag />
                    )}
                  </strong>
                  <small>
                    Confiança {formatPercent(record.confidence * 100)}
                  </small>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </>
  );
}
