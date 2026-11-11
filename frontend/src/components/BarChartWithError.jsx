// Gráfico de barras em % com barra de erro (desvio padrão) para cada série. Usado em Resultados dos treinos.
// data: [{ label, <serie>: valor, <serie>_std: desvio }] · series: [{ key, name, color }]
import { Bar, BarChart, CartesianGrid, ErrorBar, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatPercent } from "../utils/modules";

const AXIS_TICK = { fontSize: 14, fill: "#6f8798" };

export default function BarChartWithError({ data, series }) {
  if (!data.length) return <div className="empty">Sem dados para comparar.</div>;
  return (
    <div className="chart-box">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 40, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4edf2" />
          <XAxis dataKey="label" angle={-30} textAnchor="end" interval={0} tick={AXIS_TICK} stroke="#d3e2eb" />
          <YAxis
            domain={[40, 100]}
            ticks={[40, 50, 60, 70, 80, 90, 100]}
            tickFormatter={(value) => `${value}%`}
            tick={AXIS_TICK}
            stroke="#d3e2eb"
            allowDataOverflow
          />
          <Tooltip formatter={(value) => formatPercent(value)} />
          <Legend verticalAlign="top" height={32} />
          {series.map((serie) => (
            <Bar key={serie.key} dataKey={serie.key} name={serie.name} fill={serie.color} radius={[4, 4, 0, 0]}>
              <ErrorBar dataKey={`${serie.key}_std`} width={4} stroke="#24475f" />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
