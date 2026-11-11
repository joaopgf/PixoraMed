// Componentes pequenos usados em várias telas: cabeçalho da página, alerta, etapas da análise e link de texto.
import { Link } from "react-router-dom";

import Icon from "./Icon";

export function PageHeader({ label, title, description, actions }) {
  return (
    <div className="page-head">
      <div>
        <div className="eyebrow">{label}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions && <div className="head-actions">{actions}</div>}
    </div>
  );
}

export function Alert({ type = "", icon = "info", children }) {
  return (
    <div className={`alert ${type}`}>
      <Icon name={icon} />
      <div>{children}</div>
    </div>
  );
}

// current: 1 = exame, 2 = revisão, 3 = resultado
export function Steps({ current }) {
  const names = ["Exame", "Revisão", "Resultado"];
  return (
    <div className="steps-bar">
      {names.map((name, i) => (
        <div key={name} style={{ display: "contents" }}>
          {i > 0 && <div className="flow-connector" />}
          <div className={`flow-step${i + 1 <= current ? " active" : ""}`}>
            <span>{i + 1 < current ? "✓" : i + 1}</span> {name}
          </div>
        </div>
      ))}
    </div>
  );
}

export function TextLink({ to, children }) {
  return (
    <Link className="text-link" to={to}>
      {children}
    </Link>
  );
}
