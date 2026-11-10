// Resultados dos treinos: reprodução da Pele, gráficos cor x cinza e normalização, tabela de execuções e observações.
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ErrorBar, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { PageHeader } from "../components/common";
import SkinReproduction from "../components/SkinReproduction";
import { useTrainings } from "../hooks/useApiData";
import { DATASET_NOTES, LEAKAGE_SUSPICION } from "../utils/datasetNotes";
import { findModule, formatPercent } from "../utils/modules";

const COLORS = { color: "#238bb2", gray: "#a9bfcc", normalized: "#17698f", raw: "#e2a94d" };

const cancerName = (cancerType) => findModule(cancerType)?.name ?? cancerType;
const shortMode = (mode) => (mode === "color" ? "cor" : "cinza");

// Média das execuções repetidas da mesma configuração (ex.: Oral cinza rodou duas vezes)
function average(trainings, metric) {
  if (!trainings.length) return undefined;
  const value = trainings.reduce((sum, t) => sum + (metric === "acc" ? t.accuracyMean : t.f1Mean), 0) / trainings.length;
  const std = trainings.reduce((sum, t) => sum + (metric === "acc" ? t.accuracyStd : t.f1Std), 0) / trainings.length;
  return { value: +value.toFixed(2), std: +std.toFixed(2) };
}

export default function TrainingResults() {
  const trainings = useTrainings();
  const [metric, setMetric] = useState("acc");
  const [normalized, setNormalized] = useState(true);

  const cancerTypes = useMemo(
    () => [...new Set(trainings.data?.map((t) => t.cancerType))].sort(),
    [trainings.data],
  );

  const colorVsGray = useMemo(
    () =>
      cancerTypes.map((cancerType) => {
        const ofCancer = (trainings.data ?? []).filter(
          (t) => t.cancerType === cancerType && t.normalized === normalized,
        );
        const color = average(ofCancer.filter((t) => t.mode === "color"), metric);
        const gray = average(ofCancer.filter((t) => t.mode === "gray"), metric);
        return {
          label: cancerName(cancerType),
          color: color?.value,
          color_std: color?.std,
          gray: gray?.value,
          gray_std: gray?.std,
        };
      }),
    [cancerTypes, trainings.data, metric, normalized],
  );

  const normalization = useMemo(
    () =>
      cancerTypes
        .flatMap((cancerType) =>
          ["color", "gray"].map((mode) => {
            const group = (trainings.data ?? []).filter((t) => t.cancerType === cancerType && t.mode === mode);
            const yes = average(group.filter((t) => t.normalized), metric);
            const no = average(group.filter((t) => !t.normalized), metric);
            return {
              label: `${cancerName(cancerType)} ${shortMode(mode)}`,
              normalized: yes?.value,
              normalized_std: yes?.std,
              raw: no?.value,
              raw_std: no?.std,
            };
          }),
        )
        .filter((row) => row.normalized !== undefined && row.raw !== undefined),
    [cancerTypes, trainings.data, metric],
  );

  const metricName = metric === "acc" ? "Acurácia" : "F1 macro";

  return (
    <>
      <PageHeader
        label="EXPERIMENTOS"
        title="Resultados dos treinos"
        description="Nas CNNs pequenas: média ± desvio padrão no teste, em 5 folds. Diferenças menores que ~2 pontos são ruído."
        actions={
          <Toggle
            options={[
              { value: "acc", name: "Acurácia" },
              { value: "f1", name: "F1 macro" },
            ]}
            current={metric}
            onChange={setMetric}
          />
        }
      />

      <SkinReproduction />

      {trainings.isLoading && <div className="panel empty">Carregando...</div>}
      {trainings.isError && (
        <div className="panel empty">Não foi possível carregar os treinos: {trainings.error.message}</div>
      )}

      {trainings.data && (
        <div className="stack">
          <section className="panel">
            <div className="panel-head">
              <div>
                <h3>Cor vs. tons de cinza · {metricName}</h3>
                <p>Barras ausentes: configuração ainda não rodada com 5 folds.</p>
              </div>
              <Toggle
                options={[
                  { value: "yes", name: "Normalizado (/255)" },
                  { value: "no", name: "Sem normalizar" },
                ]}
                current={normalized ? "yes" : "no"}
                onChange={(value) => setNormalized(value === "yes")}
              />
            </div>
            <Chart
              data={colorVsGray}
              series={[
                { key: "color", name: "Colorido (RGB)", color: COLORS.color },
                { key: "gray", name: "Tons de cinza", color: COLORS.gray },
              ]}
            />
          </section>

          <section className="panel">
            <div className="panel-head">
              <div>
                <h3>Efeito da normalização · {metricName}</h3>
                <p>Só as configurações rodadas das duas formas.</p>
              </div>
            </div>
            <Chart
              data={normalization}
              series={[
                { key: "normalized", name: "Normalizado (/255)", color: COLORS.normalized },
                { key: "raw", name: "Sem normalizar", color: COLORS.raw },
              ]}
            />
          </section>

          <section className="panel">
            <div className="panel-head">
              <div>
                <h3>Todas as execuções</h3>
                <p>{trainings.data.length} treinos registrados no banco.</p>
              </div>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Câncer</th>
                    <th>Modo</th>
                    <th>Norm.</th>
                    <th>Imagens</th>
                    <th>GPU</th>
                    <th>Tempo</th>
                    <th>Acurácia</th>
                    <th>F1 macro</th>
                  </tr>
                </thead>
                <tbody>
                  {trainings.data.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <strong>{cancerName(t.cancerType)}</strong>
                        {t.variant && <span className="tiny muted"> ({t.variant})</span>}
                        {LEAKAGE_SUSPICION[t.cancerType] && (
                          <span className="tag-warn" title={LEAKAGE_SUSPICION[t.cancerType]}>
                            vazamento
                          </span>
                        )}
                      </td>
                      <td>{shortMode(t.mode)}</td>
                      <td>{t.normalized ? "Sim" : "Não"}</td>
                      <td className="mono">{t.totalImages}</td>
                      <td>{t.gpu.replace("NVIDIA ", "")}</td>
                      <td className="mono">{t.totalTime}</td>
                      <td className="mono">
                        {formatPercent(t.accuracyMean)} <span className="muted">± {t.accuracyStd.toFixed(2)}</span>
                      </td>
                      <td className="mono">
                        {formatPercent(t.f1Mean)} <span className="muted">± {t.f1Std.toFixed(2)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h3>Observações por dataset</h3>
            </div>
            <ul className="notes">
              {Object.entries(DATASET_NOTES).map(([cancerType, note]) => (
                <li key={cancerType}>
                  <strong>{cancerName(cancerType)}:</strong> {note} {LEAKAGE_SUSPICION[cancerType]}
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </>
  );
}

// Gráfico de barras com média e desvio (barra de erro) de cada série
function Chart({ data, series }) {
  if (!data.length) return <div className="empty">Sem dados para comparar.</div>;
  return (
    <div className="chart-box">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 40, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4edf2" />
          <XAxis
            dataKey="label"
            angle={-30}
            textAnchor="end"
            interval={0}
            tick={{ fontSize: 14, fill: "#6f8798" }}
            stroke="#d3e2eb"
          />
          <YAxis
            domain={[40, 100]}
            ticks={[40, 50, 60, 70, 80, 90, 100]}
            tickFormatter={(value) => `${value}%`}
            tick={{ fontSize: 14, fill: "#6f8798" }}
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

// Botões de alternância (ex.: Acurácia / F1 macro)
function Toggle({ options, current, onChange }) {
  return (
    <div className="seg">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={current === option.value ? "active" : ""}
          onClick={() => onChange(option.value)}
        >
          {option.name}
        </button>
      ))}
    </div>
  );
}
