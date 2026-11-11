// Resultados dos treinos: reprodução da Pele, gráficos cor x cinza e normalização, tabela de execuções e observações.
import { useMemo, useState } from "react";

import BarChartWithError from "../components/BarChartWithError";
import { PageHeader } from "../components/common";
import Panel from "../components/Panel";
import QueryState from "../components/QueryState";
import SkinReproduction from "../components/SkinReproduction";
import Toggle from "../components/Toggle";
import { useTrainings } from "../hooks/useApiData";
import { DATASET_NOTES, LEAKAGE_SUSPICION } from "../utils/datasetNotes";
import { findModule, formatPercent } from "../utils/modules";

const COLORS = {
  color: "#238bb2",
  gray: "#a9bfcc",
  normalized: "#17698f",
  raw: "#e2a94d",
};

const cancerName = (cancerType) => findModule(cancerType)?.name ?? cancerType;
const shortMode = (mode) => (mode === "color" ? "cor" : "cinza");

// Média das execuções repetidas da mesma configuração (ex.: Oral cinza rodou duas vezes)
function average(trainings, metric) {
  if (!trainings.length) return undefined;
  const value =
    trainings.reduce(
      (sum, t) => sum + (metric === "acc" ? t.accuracyMean : t.f1Mean),
      0,
    ) / trainings.length;
  const std =
    trainings.reduce(
      (sum, t) => sum + (metric === "acc" ? t.accuracyStd : t.f1Std),
      0,
    ) / trainings.length;
  return { value: +value.toFixed(2), std: +std.toFixed(2) };
}

export default function TrainingResults() {
  const trainings = useTrainings();
  const [metric, setMetric] = useState("acc");
  const [normalized, setNormalized] = useState(true);

  // Os gráficos comparam só execuções sem variante (configuração padrão), para não misturar configurações
  const standardRuns = useMemo(
    () => (trainings.data ?? []).filter((t) => !t.variant),
    [trainings.data],
  );

  const cancerTypes = useMemo(
    () => [...new Set(standardRuns.map((t) => t.cancerType))].sort(),
    [standardRuns],
  );

  const colorVsGray = useMemo(
    () =>
      cancerTypes.map((cancerType) => {
        const ofCancer = standardRuns.filter(
          (t) => t.cancerType === cancerType && t.normalized === normalized,
        );
        const color = average(
          ofCancer.filter((t) => t.mode === "color"),
          metric,
        );
        const gray = average(
          ofCancer.filter((t) => t.mode === "gray"),
          metric,
        );
        return {
          label: cancerName(cancerType),
          color: color?.value,
          color_std: color?.std,
          gray: gray?.value,
          gray_std: gray?.std,
        };
      }),
    [cancerTypes, standardRuns, metric, normalized],
  );

  const normalization = useMemo(
    () =>
      cancerTypes
        .flatMap((cancerType) =>
          ["color", "gray"].map((mode) => {
            const group = standardRuns.filter(
              (t) => t.cancerType === cancerType && t.mode === mode,
            );
            const yes = average(
              group.filter((t) => t.normalized),
              metric,
            );
            const no = average(
              group.filter((t) => !t.normalized),
              metric,
            );
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
    [cancerTypes, standardRuns, metric],
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

      <QueryState
        query={trainings}
        className="panel empty"
        errorPrefix="Não foi possível carregar os treinos"
      />

      {trainings.data && (
        <div className="stack">
          <Panel
            title={`Cor vs. tons de cinza · ${metricName}`}
            description="Só execuções sem variante. Barras ausentes: configuração ainda não rodada com 5 folds."
            actions={
              <Toggle
                options={[
                  { value: "yes", name: "Normalizado (/255)" },
                  { value: "no", name: "Sem normalizar" },
                ]}
                current={normalized ? "yes" : "no"}
                onChange={(value) => setNormalized(value === "yes")}
              />
            }
          >
            <BarChartWithError
              data={colorVsGray}
              series={[
                { key: "color", name: "Colorido (RGB)", color: COLORS.color },
                { key: "gray", name: "Tons de cinza", color: COLORS.gray },
              ]}
            />
          </Panel>

          <Panel
            title={`Efeito da normalização · ${metricName}`}
            description="Só execuções sem variante, nas configurações rodadas das duas formas."
          >
            <BarChartWithError
              data={normalization}
              series={[
                {
                  key: "normalized",
                  name: "Normalizado (/255)",
                  color: COLORS.normalized,
                },
                { key: "raw", name: "Sem normalizar", color: COLORS.raw },
              ]}
            />
          </Panel>

          <Panel
            title="Todas as execuções"
            description={`${trainings.data.length} treinos registrados no banco.`}
          >
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
                        {t.variant && (
                          <span className="tiny muted"> ({t.variant})</span>
                        )}
                        {LEAKAGE_SUSPICION[t.cancerType] && (
                          <span
                            className="tag-warn"
                            title={LEAKAGE_SUSPICION[t.cancerType]}
                          >
                            possível vazamento
                          </span>
                        )}
                      </td>
                      <td>{shortMode(t.mode)}</td>
                      <td>{t.normalized ? "Sim" : "Não"}</td>
                      <td className="mono">{t.totalImages}</td>
                      <td>{t.gpu.replace("NVIDIA ", "")}</td>
                      <td className="mono">{t.totalTime}</td>
                      <td className="mono">
                        {formatPercent(t.accuracyMean)}{" "}
                        <span className="muted">
                          ± {t.accuracyStd.toFixed(2)}
                        </span>
                      </td>
                      <td className="mono">
                        {formatPercent(t.f1Mean)}{" "}
                        <span className="muted">± {t.f1Std.toFixed(2)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Observações por dataset">
            <ul className="notes">
              {Object.entries(DATASET_NOTES).map(([cancerType, note]) => (
                <li key={cancerType}>
                  <strong>{cancerName(cancerType)}:</strong> {note}{" "}
                  {LEAKAGE_SUSPICION[cancerType]}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}
    </>
  );
}
