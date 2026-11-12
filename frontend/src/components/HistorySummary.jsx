// Cards de resumo do histórico do usuário: total de análises, suspeitas de câncer, inconclusivas e baixa certeza.
// Recebe os registros por props (não chama a API); a conta fica em utils/resultView.js.
import Icon from "./Icon";
import { summarizeHistory } from "../utils/resultView";

export default function HistorySummary({ records, models }) {
  const summary = summarizeHistory(records, models);
  const cards = [
    {
      label: "Análises",
      value: summary.total,
      note: "Registradas no seu histórico",
      icon: "activity",
    },
    {
      label: "Suspeita de câncer",
      value: summary.malignant,
      note: "Maligno (Pele) ou carcinoma espinocelular (Oral)",
      icon: "warning",
      alert: true,
    },
    {
      label: "Inconclusivas",
      value: summary.inconclusive,
      note: "Confiança abaixo de 80% (Oral e Cérebro)",
      icon: "info",
    },
    {
      label: "Baixa certeza",
      value: summary.lowConfidence,
      note: "Pele: nenhuma classe atingiu 80%",
      icon: "chart",
    },
  ];

  return (
    <section className="summary-grid" aria-label="Resumo das suas análises">
      {cards.map((card) => (
        <article
          key={card.label}
          className={`summary-card${card.alert ? " summary-card-alert" : ""}`}
        >
          <div className="summary-head">
            <span>{card.label}</span>
            <span className="summary-icon">
              <Icon name={card.icon} />
            </span>
          </div>
          <strong>{card.value}</strong>
          <small>{card.note}</small>
        </article>
      ))}
    </section>
  );
}
