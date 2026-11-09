import { useEffect, useState } from "react";

const ORGAOS = [
  {
    nome: "Cérebro",
    arquivo: "cerebro.webp",
    classe: "",
    alt: "Representação holográfica estilizada de cérebro",
  },
  {
    nome: "Rins",
    arquivo: "rins.webp",
    classe: "kidneys",
    alt: "Representação holográfica estilizada de rins",
  },
  {
    nome: "Pulmões",
    arquivo: "pulmoes.webp",
    classe: "lungs",
    alt: "Representação holográfica estilizada de pulmões",
  },
];

export default function VisualOrgaos({
  controles = false,
}: {
  controles?: boolean;
}) {
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);
  // Muda a cada clique para o intervalo recomeçar a contar
  const [reinicio, setReinicio] = useState(0);

  useEffect(() => {
    if (
      pausado ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const timer = window.setInterval(
      () => setIndice((atual) => (atual + 1) % ORGAOS.length),
      5200,
    );
    return () => window.clearInterval(timer);
  }, [pausado, reinicio]);

  function mostrar(novo: number) {
    setIndice((novo + ORGAOS.length) % ORGAOS.length);
    setReinicio((atual) => atual + 1);
  }

  return (
    <>
      <div
        className={`visual${pausado ? " paused" : ""}`}
        aria-label="Demonstração visual de estruturas anatômicas holográficas"
      >
        <div className="visual-grid" aria-hidden="true" />
        {ORGAOS.map((orgao, i) => (
          <div
            key={orgao.nome}
            className={`art ${orgao.classe}${i === indice ? " active" : ""}`}
            aria-hidden={i !== indice}
          >
            <img
              src={`/organs/${orgao.arquivo}`}
              alt={orgao.alt}
              loading={i === 0 ? "eager" : "lazy"}
            />
          </div>
        ))}
        <div className="scan-line" aria-hidden="true" />
        {["tl", "tr", "bl", "br"].map((canto) => (
          <span
            key={canto}
            className={`visual-corner ${canto}`}
            aria-hidden="true"
          />
        ))}
        <div className="visual-status">
          <span className="pill-dot" /> VISUALIZAÇÃO ILUSTRATIVA
        </div>
        <div className="organ-label">
          <small>ESTRUTURA EM DESTAQUE</small>
          <strong>{ORGAOS[indice].nome}</strong>
        </div>
      </div>

      {controles && (
        <div className="visual-controls">
          <div className="dots">
            {ORGAOS.map((orgao, i) => (
              <button
                key={orgao.nome}
                type="button"
                className={`dot${i === indice ? " active" : ""}`}
                aria-label={`Mostrar ${orgao.nome.toLowerCase()}`}
                aria-pressed={i === indice}
                onClick={() => mostrar(i)}
              />
            ))}
          </div>
          <div className="control-actions">
            <button
              type="button"
              className="control-btn"
              onClick={() => setPausado((atual) => !atual)}
            >
              {pausado ? "Reproduzir" : "Pausar"}
            </button>
            <button
              type="button"
              className="control-btn"
              onClick={() => mostrar(indice + 1)}
            >
              Próximo →
            </button>
          </div>
        </div>
      )}
    </>
  );
}
