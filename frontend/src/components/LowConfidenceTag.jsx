// Etiqueta "baixa certeza" para resultados com limiar próprio (Pele) em que nenhuma classe chegou ao mínimo.
export default function LowConfidenceTag() {
  return (
    <span
      className="tag-warn"
      title="Nenhuma classe atingiu a confiança mínima: o resultado indica um caso suspeito, não uma confirmação."
    >
      baixa certeza
    </span>
  );
}
