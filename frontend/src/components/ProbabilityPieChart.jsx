// Gráfico de rosca com a probabilidade de cada classe. Recebe os dados por props (não chama a API).
// Acessível: legenda em texto com nome e porcentagem de cada fatia, e descrição completa para leitores de tela.
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

// Cores seguras para daltonismo, em ordem fixa (validadas com o validador de paleta da skill dataviz)
const COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300"];
const OTHERS_COLOR = "#8a8a8a";
// Com mais classes que isso, as menores viram uma fatia "Outros"
const MAX_SLICES = 6;

// probabilities: [{ className, probability }] · predictedClass: classe decidida pelo backend
// formatName: nome da classe na tela · formatValue: probabilidade (0 a 1) em texto
export default function ProbabilityPieChart({ probabilities, predictedClass, formatName, formatValue }) {
  const sorted = [...probabilities].sort((a, b) => b.probability - a.probability);
  let slices = sorted.map((item, i) => ({
    key: item.className,
    name: formatName(item.className),
    value: item.probability,
    color: COLORS[i],
  }));
  if (sorted.length > MAX_SLICES) {
    const kept = slices.slice(0, MAX_SLICES - 1);
    const others = slices.slice(MAX_SLICES - 1).reduce((sum, slice) => sum + slice.value, 0);
    slices = [...kept, { key: "others", name: "Outros", value: others, color: OTHERS_COLOR }];
  }

  const highlighted = slices.find((slice) => slice.key === predictedClass) ?? slices[0];
  const description = `Gráfico de pizza das probabilidades por classe: ${slices
    .map((slice) => `${slice.name} ${formatValue(slice.value)}`)
    .join(", ")}.`;

  return (
    <figure className="pie-chart" role="img" aria-label={description}>
      <div className="pie-chart-plot" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              innerRadius="58%"
              outerRadius="92%"
              startAngle={90}
              endAngle={-270}
              stroke="#ffffff"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {slices.map((slice) => (
                <Cell key={slice.key} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatValue(value)} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pie-chart-center">
          <strong>{formatValue(highlighted.value)}</strong>
          <span>{highlighted.name}</span>
        </div>
      </div>
      <ul className="pie-chart-legend" aria-hidden="true">
        {slices.map((slice) => (
          <li key={slice.key} className={slice.key === predictedClass ? "predicted" : ""}>
            <span className="pie-chart-swatch" style={{ background: slice.color }} />
            <span className="pie-chart-name">
              {slice.name}
              {slice.key === predictedClass && <small> · classe prevista</small>}
            </span>
            <span className="pie-chart-value mono">{formatValue(slice.value)}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
