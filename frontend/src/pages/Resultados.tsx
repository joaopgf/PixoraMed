import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ErrorBar,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { api, type Treino } from "../api";
import { CabecalhoPagina } from "../components/Estrutura";
import ReproducaoPele from "../components/ReproducaoPele";
import { formatarPct, NOTAS_DATASET, SUSPEITA_VAZAMENTO } from "../dados";

type Metrica = "acc" | "f1";

const CORES = {
  cor: "#238bb2",
  cinza: "#a9bfcc",
  sim: "#17698f",
  nao: "#e2a94d",
};

// Média das execuções repetidas da mesma configuração (ex.: Oral cinza rodou duas vezes)
function media(treinos: Treino[], metrica: Metrica) {
  if (!treinos.length) return undefined;
  const valor =
    treinos.reduce(
      (soma, t) => soma + (metrica === "acc" ? t.acc_media : t.f1_media),
      0,
    ) / treinos.length;
  const desvio =
    treinos.reduce(
      (soma, t) => soma + (metrica === "acc" ? t.acc_desvio : t.f1_desvio),
      0,
    ) / treinos.length;
  return { valor: +valor.toFixed(2), desvio: +desvio.toFixed(2) };
}

export default function Resultados() {
  const treinos = useQuery({ queryKey: ["treinos"], queryFn: api.treinos });
  const [metrica, setMetrica] = useState<Metrica>("acc");
  const [normalizado, setNormalizado] = useState(true);

  const canceres = useMemo(
    () => [...new Set(treinos.data?.map((t) => t.cancer))].sort(),
    [treinos.data],
  );

  const corVsCinza = useMemo(
    () =>
      canceres.map((cancer) => {
        const doCancer = (treinos.data ?? []).filter(
          (t) => t.cancer === cancer && t.normalizado === normalizado,
        );
        const cor = media(
          doCancer.filter((t) => t.modo === "cor"),
          metrica,
        );
        const cinza = media(
          doCancer.filter((t) => t.modo === "cinza"),
          metrica,
        );
        return {
          cancer,
          cor: cor?.valor,
          cor_desvio: cor?.desvio,
          cinza: cinza?.valor,
          cinza_desvio: cinza?.desvio,
        };
      }),
    [canceres, treinos.data, metrica, normalizado],
  );

  const normalizacao = useMemo(
    () =>
      canceres
        .flatMap((cancer) =>
          (["cor", "cinza"] as const).map((modo) => {
            const grupo = (treinos.data ?? []).filter(
              (t) => t.cancer === cancer && t.modo === modo,
            );
            const sim = media(
              grupo.filter((t) => t.normalizado),
              metrica,
            );
            const nao = media(
              grupo.filter((t) => !t.normalizado),
              metrica,
            );
            return {
              rotulo: `${cancer} ${modo}`,
              sim: sim?.valor,
              sim_desvio: sim?.desvio,
              nao: nao?.valor,
              nao_desvio: nao?.desvio,
            };
          }),
        )
        .filter((linha) => linha.sim !== undefined && linha.nao !== undefined),
    [canceres, treinos.data, metrica],
  );

  const nomeMetrica = metrica === "acc" ? "Acurácia" : "F1 macro";

  return (
    <>
      <CabecalhoPagina
        rotulo="EXPERIMENTOS"
        titulo="Resultados dos treinos"
        descricao="Nas CNNs pequenas: média ± desvio padrão no teste, em 5 folds. Diferenças menores que ~2 pontos são ruído."
        acoes={
          <Alternador
            opcoes={[
              { valor: "acc", nome: "Acurácia" },
              { valor: "f1", nome: "F1 macro" },
            ]}
            atual={metrica}
            aoMudar={(valor) => setMetrica(valor as Metrica)}
          />
        }
      />

      <ReproducaoPele />

      {treinos.isLoading && <div className="panel empty">Carregando...</div>}
      {treinos.isError && (
        <div className="panel empty">
          Não foi possível carregar os treinos: {treinos.error.message}
        </div>
      )}

      {treinos.data && (
        <div className="stack">
          <section className="panel">
            <div className="panel-head">
              <div>
                <h3>Cor vs. tons de cinza · {nomeMetrica}</h3>
                <p>
                  Barras ausentes: configuração ainda não rodada com 5 folds.
                </p>
              </div>
              <Alternador
                opcoes={[
                  { valor: "sim", nome: "Normalizado (/255)" },
                  { valor: "nao", nome: "Sem normalizar" },
                ]}
                atual={normalizado ? "sim" : "nao"}
                aoMudar={(valor) => setNormalizado(valor === "sim")}
              />
            </div>
            <Grafico
              dados={corVsCinza}
              chaveX="cancer"
              series={[
                { chave: "cor", nome: "Colorido (RGB)", cor: CORES.cor },
                { chave: "cinza", nome: "Tons de cinza", cor: CORES.cinza },
              ]}
            />
          </section>

          <section className="panel">
            <div className="panel-head">
              <div>
                <h3>Efeito da normalização · {nomeMetrica}</h3>
                <p>Só as configurações rodadas das duas formas.</p>
              </div>
            </div>
            <Grafico
              dados={normalizacao}
              chaveX="rotulo"
              series={[
                { chave: "sim", nome: "Normalizado (/255)", cor: CORES.sim },
                { chave: "nao", nome: "Sem normalizar", cor: CORES.nao },
              ]}
            />
          </section>

          <section className="panel">
            <div className="panel-head">
              <div>
                <h3>Todas as execuções</h3>
                <p>{treinos.data.length} treinos registrados no banco.</p>
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
                  {treinos.data.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <strong>{t.cancer}</strong>
                        {t.variante && (
                          <span className="tiny muted"> ({t.variante})</span>
                        )}
                        {SUSPEITA_VAZAMENTO[t.cancer] && (
                          <span
                            className="tag-warn"
                            title={SUSPEITA_VAZAMENTO[t.cancer]}
                          >
                            vazamento
                          </span>
                        )}
                      </td>
                      <td>{t.modo}</td>
                      <td>{t.normalizado ? "Sim" : "Não"}</td>
                      <td className="mono">{t.imagens_total}</td>
                      <td>{t.gpu.replace("NVIDIA ", "")}</td>
                      <td className="mono">{t.tempo_total}</td>
                      <td className="mono">
                        {formatarPct(t.acc_media)}{" "}
                        <span className="muted">
                          ± {t.acc_desvio.toFixed(2)}
                        </span>
                      </td>
                      <td className="mono">
                        {formatarPct(t.f1_media)}{" "}
                        <span className="muted">
                          ± {t.f1_desvio.toFixed(2)}
                        </span>
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
            <ul className="notas">
              {Object.entries(NOTAS_DATASET).map(([cancer, nota]) => (
                <li key={cancer}>
                  <strong>{cancer}:</strong> {nota} {SUSPEITA_VAZAMENTO[cancer]}
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </>
  );
}

type Serie = { chave: string; nome: string; cor: string };

function Grafico({
  dados,
  chaveX,
  series,
}: {
  dados: object[];
  chaveX: string;
  series: Serie[];
}) {
  if (!dados.length)
    return <div className="empty">Sem dados para comparar.</div>;
  return (
    <div className="chart-box">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={dados}
          margin={{ top: 8, right: 8, bottom: 40, left: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#e4edf2"
          />
          <XAxis
            dataKey={chaveX}
            angle={-30}
            textAnchor="end"
            interval={0}
            tick={{ fontSize: 11, fill: "#6f8798" }}
            stroke="#d3e2eb"
          />
          <YAxis
            domain={[40, 100]}
            ticks={[40, 50, 60, 70, 80, 90, 100]}
            tickFormatter={(valor) => `${valor}%`}
            tick={{ fontSize: 11, fill: "#6f8798" }}
            stroke="#d3e2eb"
            allowDataOverflow
          />
          <Tooltip formatter={(valor: number) => formatarPct(valor)} />
          <Legend verticalAlign="top" height={32} />
          {series.map((serie) => (
            <Bar
              key={serie.chave}
              dataKey={serie.chave}
              name={serie.nome}
              fill={serie.cor}
              radius={[4, 4, 0, 0]}
            >
              <ErrorBar
                dataKey={`${serie.chave}_desvio`}
                width={4}
                stroke="#24475f"
              />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Alternador({
  opcoes,
  atual,
  aoMudar,
}: {
  opcoes: { valor: string; nome: string }[];
  atual: string;
  aoMudar: (valor: string) => void;
}) {
  return (
    <div className="seg">
      {opcoes.map((opcao) => (
        <button
          key={opcao.valor}
          type="button"
          className={atual === opcao.valor ? "active" : ""}
          onClick={() => aoMudar(opcao.valor)}
        >
          {opcao.nome}
        </button>
      ))}
    </div>
  );
}
