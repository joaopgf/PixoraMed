// Painel inicial depois do login: contadores, acesso rápido aos módulos, fluxo de trabalho e atividade recente.
import { useNavigate } from "react-router-dom";

import { PageHeader, TextLink } from "../components/common";
import Icon from "../components/Icon";
import { useModels, usePredictionHistory, useTrainings } from "../hooks/useApiData";
import { className, formatDate, formatPercent, MODULES, parseModelId, recordCode } from "../utils/modules";

const WORKFLOW = [
  { title: "Selecionar módulo", text: "Escolher o módulo compatível com a imagem." },
  { title: "Preparar o caso", text: "Anexar a imagem e conferir o modelo que será usado." },
  { title: "Revisar o retorno", text: "Consultar a classe prevista, as probabilidades e as limitações." },
];

const twoDigits = (value) => (value === undefined ? "–" : String(value).padStart(2, "0"));

export default function Dashboard() {
  const navigate = useNavigate();
  const models = useModels();
  const trainings = useTrainings();
  const predictions = usePredictionHistory();

  const metrics = [
    { label: "MÓDULOS NO CATÁLOGO", value: twoDigits(MODULES.length), note: "Tipos de câncer na plataforma", icon: "layers" },
    { label: "MODELOS CONECTADOS", value: twoDigits(models.data?.length), note: "Modelos ONNX no serviço de IA", icon: "activity" },
    { label: "TREINOS REGISTRADOS", value: twoDigits(trainings.data?.length), note: "Execuções de 5 folds no banco", icon: "chart" },
    { label: "ANÁLISES RECENTES", value: twoDigits(predictions.data?.length), note: "Previsões no histórico (até 100)", icon: "file" },
  ];

  return (
    <>
      <PageHeader
        label="VISÃO GERAL"
        title="Painel de trabalho"
        description="Acompanhe o ambiente, acesse módulos e inicie uma nova análise."
        actions={
          <button type="button" className="btn primary" onClick={() => navigate("/new-analysis")}>
            <Icon name="plusfile" /> Nova análise
          </button>
        }
      />

      <section className="welcome-panel">
        <div className="welcome-copy">
          <div className="eyebrow">ESPAÇO DE TRABALHO</div>
          <h2>Bem-vindo à PixoraMed.</h2>
          <p>
            Analise imagens com os modelos treinados pelo grupo, acompanhe o
            histórico e compare os resultados dos treinos em um único ambiente.
          </p>
          <button type="button" className="btn primary" onClick={() => navigate("/new-analysis")}>
            Começar uma análise <Icon name="arrow" />
          </button>
        </div>
        <div className="welcome-art">
          <img src="/organs/brain.webp" alt="Visualização ilustrativa de cérebro holográfico" />
        </div>
      </section>

      <section className="metric-grid">
        {metrics.map((metric) => (
          <article key={metric.label} className="metric">
            <div className="metric-head">
              <span>{metric.label}</span>
              <span className="metric-icon">
                <Icon name={metric.icon} />
              </span>
            </div>
            <strong>{metric.value}</strong>
            <small>{metric.note}</small>
          </article>
        ))}
      </section>

      <div className="dash-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Acesso rápido aos módulos</h3>
              <p>Selecione a área para iniciar uma análise.</p>
            </div>
            <TextLink to="/new-analysis">Ver todos →</TextLink>
          </div>
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
        </section>

        <aside className="panel">
          <div className="panel-head">
            <div>
              <h3>Fluxo de trabalho</h3>
              <p>Etapas de uma análise</p>
            </div>
          </div>
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
        </aside>
      </div>

      <section className="panel" style={{ marginTop: 16 }}>
        <div className="panel-head">
          <div>
            <h3>Atividade recente</h3>
            <p>Últimas previsões registradas no banco.</p>
          </div>
          <TextLink to="/history">Abrir histórico →</TextLink>
        </div>
        {predictions.isError && (
          <div className="empty">Não foi possível carregar: {predictions.error.message}</div>
        )}
        {predictions.data?.length === 0 && <div className="empty">Nenhuma análise feita ainda.</div>}
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
                  <strong>{className(record.predictedClass)}</strong>
                  <small>Confiança {formatPercent(record.confidence * 100)}</small>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
