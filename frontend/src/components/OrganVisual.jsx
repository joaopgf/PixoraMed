// Ilustração animada do cérebro na página inicial e no login, com botão opcional para pausar a animação.
import { useState } from "react";

export default function OrganVisual({ controls = false }) {
  const [paused, setPaused] = useState(false);

  return (
    <>
      <div
        className={`visual${paused ? " paused" : ""}`}
        aria-label="Demonstração visual de estrutura anatômica holográfica"
      >
        <div className="visual-grid" aria-hidden="true" />
        <div className="art active" aria-hidden="true">
          <img
            src="/organs/brain.webp"
            alt="Representação holográfica estilizada de cérebro"
          />
        </div>
        <div className="scan-line" aria-hidden="true" />
        {["tl", "tr", "bl", "br"].map((corner) => (
          <span
            key={corner}
            className={`visual-corner ${corner}`}
            aria-hidden="true"
          />
        ))}
        <div className="visual-status">
          <span className="pill-dot" /> VISUALIZAÇÃO ILUSTRATIVA
        </div>
        <div className="organ-label">
          <small>ESTRUTURA EM DESTAQUE</small>
          <strong>Cérebro</strong>
        </div>
      </div>

      {controls && (
        <div className="visual-controls">
          <button
            type="button"
            className="control-btn"
            onClick={() => setPaused((current) => !current)}
          >
            {paused ? "Reproduzir animação" : "Pausar animação"}
          </button>
        </div>
      )}
    </>
  );
}
