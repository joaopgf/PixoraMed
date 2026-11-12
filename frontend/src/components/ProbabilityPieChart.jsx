// Gráfico de rosca com a probabilidade de cada classe. Recebe os dados por props (não chama a API).
// Acessível: legenda em texto com nome e porcentagem de cada fatia, e descrição completa para leitores de tela.
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

// Cores seguras para daltonismo (validadas com o validador de paleta da skill dataviz).
// Classes de alerta (malignas) usam sempre o vermelho; as demais seguem a ordem fixa da paleta, sem
// vermelho nem laranja, para não parecerem alerta.
const ALERT_COLOR = "#d03b3b";
const COLORS = [
  "#2a78d6",
  "#1baf7a",
  "#eda100",
  "#e87ba4",
  "#008300",
  "#6250d6",
];
const OTHERS_COLOR = "#8a8a8a";
// Com mais classes que isso, as menores viram uma fatia "Outros"
const MAX_SLICES = 6;

// probabilities: [{ className, probability }] · classes: classes do modelo, na ordem do treino (define as cores)
// predictedClass: classe decidida pelo backend · alertClasses: classes pintadas de vermelho
// formatName: nome da classe na tela · formatValue: probabilidade (0 a 1) em texto
export default function ProbabilityPieChart({
  probabilities,
  classes,
  predictedClass,
  alertClasses = [],
  formatName,
  formatValue,
}) {
  // A cor segue a classe (ordem do modelo), não a posição no ranking: a mesma classe tem sempre a mesma cor
  const order = classes?.length
    ? classes
    : probabilities.map((item) => item.className);
  let nextColor = 0;
  const colorOf = new Map(
    order.map((name) => [
      name,
      alertClasses.includes(name)
        ? ALERT_COLOR
        : COLORS[nextColor++ % COLORS.length],
    ]),
  );
  const sorted = [...probabilities].sort(
    (a, b) => b.probability - a.probability,
  );
  let slices = sorted.map((item) => ({
    key: item.className,
    name: formatName(item.className),
    value: item.probability,
    color: colorOf.get(item.className),
  }));
  if (sorted.length > MAX_SLICES) {
    const kept = slices.slice(0, MAX_SLICES - 1);
    const others = slices
      .slice(MAX_SLICES - 1)
      .reduce((sum, slice) => sum + slice.value, 0);
    slices = [
      ...kept,
      { key: "others", name: "Outros", value: others, color: OTHERS_COLOR },
    ];
  }

  const highlighted =
    slices.find((slice) => slice.key === predictedClass) ?? slices[0];
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
          <li
            key={slice.key}
            className={slice.key === predictedClass ? "predicted" : ""}
          >
            <span
              className="pie-chart-swatch"
              style={{ background: slice.color }}
            />
            <span className="pie-chart-name">
              {slice.name}
              {slice.key === predictedClass && (
                <small> · classe prevista</small>
              )}
            </span>
            <span className="pie-chart-value mono">
              {formatValue(slice.value)}
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
