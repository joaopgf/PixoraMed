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
import { Aviso, Carregando, Cartao } from "../components/Cartao";
import { formatarPct, NOTAS_DATASET, SUSPEITA_VAZAMENTO } from "../dados";

type Metrica = "acc" | "f1";

const CORES = { cor: "#0d9488", cinza: "#94a3b8", sim: "#0f766e", nao: "#f59e0b" };

// Média das execuções repetidas da mesma configuração (ex.: Oral cinza rodou duas vezes)
function media(treinos: Treino[], metrica: Metrica) {
  if (!treinos.length) return undefined;
  const valor = treinos.reduce((soma, t) => soma + (metrica === "acc" ? t.acc_media : t.f1_media), 0) / treinos.length;
  const desvio = treinos.reduce((soma, t) => soma + (metrica === "acc" ? t.acc_desvio : t.f1_desvio), 0) / treinos.length;
  return { valor: +valor.toFixed(2), desvio: +desvio.toFixed(2) };
}

export default function Resultados() {
  const treinos = useQuery({ queryKey: ["treinos"], queryFn: api.treinos });
  const [metrica, setMetrica] = useState<Metrica>("acc");
  const [normalizado, setNormalizado] = useState(true);

  const canceres = useMemo(() => [...new Set(treinos.data?.map((t) => t.cancer))].sort(), [treinos.data]);

  const corVsCinza = useMemo(
    () =>
      canceres.map((cancer) => {
        const doCancer = (treinos.data ?? []).filter((t) => t.cancer === cancer && t.normalizado === normalizado);
        const cor = media(doCancer.filter((t) => t.modo === "cor"), metrica);
        const cinza = media(doCancer.filter((t) => t.modo === "cinza"), metrica);
        return { cancer, cor: cor?.valor, cor_desvio: cor?.desvio, cinza: cinza?.valor, cinza_desvio: cinza?.desvio };
      }),
    [canceres, treinos.data, metrica, normalizado],
  );

  const normalizacao = useMemo(
    () =>
      canceres.flatMap((cancer) =>
        (["cor", "cinza"] as const).map((modo) => {
          const grupo = (treinos.data ?? []).filter((t) => t.cancer === cancer && t.modo === modo);
          const sim = media(grupo.filter((t) => t.normalizado), metrica);
          const nao = media(grupo.filter((t) => !t.normalizado), metrica);
          return { rotulo: `${cancer} ${modo}`, sim: sim?.valor, sim_desvio: sim?.desvio, nao: nao?.valor, nao_desvio: nao?.desvio };
        }),
      ).filter((linha) => linha.sim !== undefined && linha.nao !== undefined),
    [canceres, treinos.data, metrica],
  );

  if (treinos.isLoading) return <Carregando />;
  if (treinos.isError) return <Aviso tipo="alerta">Não foi possível carregar os treinos: {treinos.error.message}</Aviso>;

  const nomeMetrica = metrica === "acc" ? "Acurácia" : "F1 macro";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Resultados dos treinos</h1>
          <p className="mt-1 text-sm text-slate-600">
            Média ± desvio padrão no teste, em 5 folds. Diferenças menores que ~2 pontos são ruído.
          </p>
        </div>
        <div className="flex gap-2">
          <Alternador
            opcoes={[
              { valor: "acc", nome: "Acurácia" },
              { valor: "f1", nome: "F1 macro" },
            ]}
            atual={metrica}
            aoMudar={(valor) => setMetrica(valor as Metrica)}
          />
        </div>
      </div>

      <Cartao titulo={`Cor vs. tons de cinza · ${nomeMetrica}`}>
        <div className="mb-3">
          <Alternador
            opcoes={[
              { valor: "sim", nome: "Normalizado (/255)" },
              { valor: "nao", nome: "Sem normalizar" },
            ]}
            atual={normalizado ? "sim" : "nao"}
            aoMudar={(valor) => setNormalizado(valor === "sim")}
          />
        </div>
        <Grafico dados={corVsCinza} chaveX="cancer" series={[
          { chave: "cor", nome: "Colorido (RGB)", cor: CORES.cor },
          { chave: "cinza", nome: "Tons de cinza", cor: CORES.cinza },
        ]} />
        <p className="mt-2 text-xs text-slate-500">
          Barras ausentes: configuração ainda não rodada com 5 folds.
        </p>
      </Cartao>

      <Cartao titulo={`Efeito da normalização · ${nomeMetrica}`}>
        <Grafico dados={normalizacao} chaveX="rotulo" series={[
          { chave: "sim", nome: "Normalizado (/255)", cor: CORES.sim },
          { chave: "nao", nome: "Sem normalizar", cor: CORES.nao },
        ]} />
      </Cartao>

      <Cartao titulo="Todas as execuções">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2 pr-3">Câncer</th>
                <th className="py-2 pr-3">Modo</th>
                <th className="py-2 pr-3">Norm.</th>
                <th className="py-2 pr-3">Imagens</th>
                <th className="py-2 pr-3">GPU</th>
                <th className="py-2 pr-3">Tempo</th>
                <th className="py-2 pr-3 text-right">Acurácia</th>
                <th className="py-2 text-right">F1 macro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {treinos.data!.map((t) => (
                <tr key={t.id}>
                  <td className="py-2 pr-3">
                    <span className="font-medium text-slate-800">{t.cancer}</span>
                    {t.variante && <span className="ml-1 text-xs text-slate-500">({t.variante})</span>}
                    {SUSPEITA_VAZAMENTO[t.cancer] && (
                      <span
                        title={SUSPEITA_VAZAMENTO[t.cancer]}
                        className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800"
                      >
                        vazamento
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-3">{t.modo}</td>
                  <td className="py-2 pr-3">{t.normalizado ? "Sim" : "Não"}</td>
                  <td className="py-2 pr-3 tabular-nums">{t.imagens_total}</td>
                  <td className="py-2 pr-3 text-slate-600">{t.gpu.replace("NVIDIA ", "")}</td>
                  <td className="py-2 pr-3 tabular-nums text-slate-600">{t.tempo_total}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {formatarPct(t.acc_media)} <span className="text-slate-400">± {t.acc_desvio.toFixed(2)}</span>
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {formatarPct(t.f1_media)} <span className="text-slate-400">± {t.f1_desvio.toFixed(2)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Cartao>

      <Cartao titulo="Observações por dataset">
        <ul className="space-y-2 text-sm text-slate-700">
          {Object.entries({ ...NOTAS_DATASET, ...SUSPEITA_VAZAMENTO }).map(([cancer, nota]) => (
            <li key={cancer}>
              <span className="font-medium">{cancer}:</span> {nota}
            </li>
          ))}
        </ul>
      </Cartao>
    </div>
  );
}

type Serie = { chave: string; nome: string; cor: string };

function Grafico({ dados, chaveX, series }: { dados: object[]; chaveX: string; series: Serie[] }) {
  if (!dados.length) return <p className="text-sm text-slate-500">Sem dados para comparar.</p>;
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} margin={{ top: 8, right: 8, bottom: 40, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey={chaveX} angle={-30} textAnchor="end" interval={0} tick={{ fontSize: 12 }} />
          <YAxis domain={[50, 100]} ticks={[50, 60, 70, 80, 90, 100]} tickFormatter={(valor) => `${valor}%`} tick={{ fontSize: 12 }} allowDataOverflow />
          <Tooltip formatter={(valor: number) => formatarPct(valor)} />
          <Legend verticalAlign="top" height={32} />
          {series.map((serie) => (
            <Bar key={serie.chave} dataKey={serie.chave} name={serie.nome} fill={serie.cor} radius={[4, 4, 0, 0]}>
              <ErrorBar dataKey={`${serie.chave}_desvio`} width={4} stroke="#334155" />
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
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm">
      {opcoes.map((opcao) => (
        <button
          key={opcao.valor}
          onClick={() => aoMudar(opcao.valor)}
          className={`rounded-md px-3 py-1 ${atual === opcao.valor ? "bg-marca-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
        >
          {opcao.nome}
        </button>
      ))}
    </div>
  );
}
