import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { api } from "../api";
import { Cartao } from "../components/Cartao";

const etapas = [
  { titulo: "1. Dados", texto: "Multi Cancer (Kaggle) e HAM10000 (pele): 9 tipos de câncer, imagens 128×128." },
  { titulo: "2. Treino", texto: "CNN pequena em PyTorch (~24 mil parâmetros), 5 folds, cor vs. cinza, com e sem normalização." },
  { titulo: "3. Resultados", texto: "Cada execução vira uma linha no banco SQL, importada do resultados.csv com Pandas." },
  { titulo: "4. App", texto: "Modelo exportado para ONNX e servido por uma API FastAPI para este painel em React." },
];

export default function Inicio() {
  const treinos = useQuery({ queryKey: ["treinos"], queryFn: api.treinos });
  const modelos = useQuery({ queryKey: ["modelos"], queryFn: api.modelos });

  const canceres = new Set(treinos.data?.map((treino) => treino.cancer));

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-gradient-to-br from-marca-700 to-marca-900 px-6 py-10 text-white sm:px-10">
        <h1 className="text-3xl font-bold sm:text-4xl">PixoraMed</h1>
        <p className="mt-3 max-w-2xl text-marca-50">
          Classificação de imagens médicas de câncer com redes neurais convolucionais, e uma análise honesta do que os
          números significam.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/analisar" className="rounded-lg bg-white px-4 py-2 font-medium text-marca-900 hover:bg-marca-50">
            Analisar uma imagem
          </Link>
          <Link to="/resultados" className="rounded-lg border border-white/40 px-4 py-2 font-medium hover:bg-white/10">
            Ver resultados dos treinos
          </Link>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <Numero rotulo="Treinos registrados" valor={treinos.data?.length} />
        <Numero rotulo="Tipos de câncer" valor={treinos.data ? canceres.size : undefined} />
        <Numero rotulo="Modelos disponíveis no app" valor={modelos.data?.length} />
      </div>

      <Cartao titulo="Como funciona">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {etapas.map((etapa) => (
            <div key={etapa.titulo}>
              <h3 className="font-medium text-marca-700">{etapa.titulo}</h3>
              <p className="mt-1 text-sm text-slate-600">{etapa.texto}</p>
            </div>
          ))}
        </div>
      </Cartao>
    </div>
  );
}

function Numero({ rotulo, valor }: { rotulo: string; valor?: number }) {
  return (
    <Cartao>
      <p className="text-sm text-slate-500">{rotulo}</p>
      <p className="mt-1 text-3xl font-semibold text-slate-900">{valor ?? "–"}</p>
    </Cartao>
  );
}
