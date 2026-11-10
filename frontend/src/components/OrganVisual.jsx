// Ilustração animada de órgãos (cérebro, rins, pulmões) da página inicial e do login, com controles opcionais.
import { useEffect, useState } from "react";

const ORGANS = [
  { name: "Cérebro", file: "brain.webp", className: "", alt: "Representação holográfica estilizada de cérebro" },
  { name: "Rins", file: "kidneys.webp", className: "kidneys", alt: "Representação holográfica estilizada de rins" },
  { name: "Pulmões", file: "lungs.webp", className: "lungs", alt: "Representação holográfica estilizada de pulmões" },
];

export default function OrganVisual({ controls = false }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  // Muda a cada clique para o intervalo recomeçar a contar
  const [restart, setRestart] = useState(0);

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % ORGANS.length), 5200);
    return () => window.clearInterval(timer);
  }, [paused, restart]);

  function show(next) {
    setIndex((next + ORGANS.length) % ORGANS.length);
    setRestart((current) => current + 1);
  }

  return (
    <>
      <div
        className={`visual${paused ? " paused" : ""}`}
        aria-label="Demonstração visual de estruturas anatômicas holográficas"
      >
        <div className="visual-grid" aria-hidden="true" />
        {ORGANS.map((organ, i) => (
          <div
            key={organ.name}
            className={`art ${organ.className}${i === index ? " active" : ""}`}
            aria-hidden={i !== index}
          >
            <img src={`/organs/${organ.file}`} alt={organ.alt} loading={i === 0 ? "eager" : "lazy"} />
          </div>
        ))}
        <div className="scan-line" aria-hidden="true" />
        {["tl", "tr", "bl", "br"].map((corner) => (
          <span key={corner} className={`visual-corner ${corner}`} aria-hidden="true" />
        ))}
        <div className="visual-status">
          <span className="pill-dot" /> VISUALIZAÇÃO ILUSTRATIVA
        </div>
        <div className="organ-label">
          <small>ESTRUTURA EM DESTAQUE</small>
          <strong>{ORGANS[index].name}</strong>
        </div>
      </div>

      {controls && (
        <div className="visual-controls">
          <div className="dots">
            {ORGANS.map((organ, i) => (
              <button
                key={organ.name}
                type="button"
                className={`dot${i === index ? " active" : ""}`}
                aria-label={`Mostrar ${organ.name.toLowerCase()}`}
                aria-pressed={i === index}
                onClick={() => show(i)}
              />
            ))}
          </div>
          <div className="control-actions">
            <button type="button" className="control-btn" onClick={() => setPaused((current) => !current)}>
              {paused ? "Reproduzir" : "Pausar"}
            </button>
            <button type="button" className="control-btn" onClick={() => show(index + 1)}>
              Próximo →
            </button>
          </div>
        </div>
      )}
    </>
  );
}
