// Linha de rótulo e valor (ex.: "Módulo · Pele") usada nos resumos de caso, resultado e conta.
export default function InfoPair({ label, mono = false, children }) {
  return (
    <div className="info-pair">
      <span>{label}</span>
      <strong className={mono ? "mono" : undefined}>{children}</strong>
    </div>
  );
}
