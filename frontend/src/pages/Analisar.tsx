import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { api, type Modelo } from "../api";
import { Aviso, Carregando, Cartao } from "../components/Cartao";
import { formatarPct, SUSPEITA_VAZAMENTO } from "../dados";

export default function Analisar() {
  const modelos = useQuery({ queryKey: ["modelos"], queryFn: api.modelos });
  const [modeloId, setModeloId] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);

  const previsao = useMutation({ mutationFn: () => api.prever(modeloId, arquivo!) });

  useEffect(() => {
    if (!modeloId && modelos.data?.length) setModeloId(modelos.data[0].id);
  }, [modelos.data, modeloId]);

  useEffect(() => {
    if (!arquivo) return setPrevia(null);
    const url = URL.createObjectURL(arquivo);
    setPrevia(url);
    return () => URL.revokeObjectURL(url);
  }, [arquivo]);

  const modelo = modelos.data?.find((item) => item.id === modeloId);

  function escolherArquivo(novo: File | undefined) {
    setArquivo(novo ?? null);
    previsao.reset();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Analisar imagem</h1>
        <p className="mt-1 text-sm text-slate-600">
          Escolha o tipo de câncer, envie uma imagem do mesmo tipo de exame usado no treino e veja a classe prevista.
        </p>
      </div>

      <Aviso tipo="alerta">
        Ferramenta acadêmica. O resultado <strong>não é um diagnóstico</strong>. A imagem é processada e descartada: só a
        classe prevista fica registrada.
      </Aviso>

      {modelos.isLoading && <Carregando texto="Carregando modelos..." />}
      {modelos.isError && <Aviso tipo="alerta">Não foi possível falar com a API: {modelos.error.message}</Aviso>}
      {modelos.data?.length === 0 && (
        <Aviso>
          Nenhum modelo disponível ainda. Salve um modelo no notebook e converta com{" "}
          <code>scripts/exportar_onnx.py</code> (veja <code>docs/salvar_modelo.md</code>).
        </Aviso>
      )}

      {!!modelos.data?.length && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Cartao titulo="Entrada">
            <label className="block text-sm font-medium text-slate-700">Modelo</label>
            <select
              value={modeloId}
              onChange={(evento) => {
                setModeloId(evento.target.value);
                previsao.reset();
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {modelos.data.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.cancer} · {item.modo === "cor" ? "colorido" : "tons de cinza"}
                </option>
              ))}
            </select>
            {modelo && <InfoModelo modelo={modelo} />}

            <label
              className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center hover:border-marca-500"
              onDragOver={(evento) => evento.preventDefault()}
              onDrop={(evento) => {
                evento.preventDefault();
                escolherArquivo(evento.dataTransfer.files[0]);
              }}
            >
              {previa ? (
                <img src={previa} alt="Imagem enviada" className="max-h-64 rounded-lg object-contain" />
              ) : (
                <>
                  <span className="text-sm font-medium text-slate-700">Clique ou arraste uma imagem aqui</span>
                  <span className="mt-1 text-xs text-slate-500">JPG ou PNG, até 10 MB</span>
                </>
              )}
              <input
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={(evento) => escolherArquivo(evento.target.files?.[0])}
              />
            </label>

            <button
              disabled={!arquivo || !modeloId || previsao.isPending}
              onClick={() => previsao.mutate()}
              className="mt-4 w-full rounded-lg bg-marca-600 px-4 py-2.5 font-medium text-white hover:bg-marca-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {previsao.isPending ? "Analisando..." : "Analisar"}
            </button>
          </Cartao>

          <Cartao titulo="Resultado">
            {!previsao.data && !previsao.isError && (
              <p className="text-sm text-slate-500">O resultado aparece aqui depois da análise.</p>
            )}
            {previsao.isError && <Aviso tipo="alerta">{previsao.error.message}</Aviso>}
            {previsao.data && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-500">Classe prevista</p>
                  <p className="text-3xl font-semibold text-marca-700">{previsao.data.classe_prevista}</p>
                  <p className="text-sm text-slate-600">
                    Confiança do modelo: {formatarPct(previsao.data.confianca * 100)} ·{" "}
                    {previsao.data.tempo_ms.toFixed(0)} ms
                  </p>
                </div>
                <div className="space-y-2">
                  {previsao.data.probabilidades.map((item) => (
                    <div key={item.classe}>
                      <div className="flex justify-between text-sm">
                        <span>{item.classe}</span>
                        <span className="tabular-nums text-slate-600">{formatarPct(item.probabilidade * 100)}</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-marca-500"
                          style={{ width: `${Math.max(item.probabilidade * 100, 0.5)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500">
                  A "confiança" é a saída softmax da rede, não uma probabilidade calibrada de doença.
                </p>
                <Aviso tipo="alerta">{previsao.data.aviso}</Aviso>
              </div>
            )}
          </Cartao>
        </div>
      )}
    </div>
  );
}

function InfoModelo({ modelo }: { modelo: Modelo }) {
  const { acc_media, acc_desvio, f1_media } = modelo.metricas;
  return (
    <div className="mt-3 space-y-2 text-sm text-slate-600">
      <p>
        Classes: <span className="font-medium text-slate-800">{modelo.classes.join(", ")}</span>
      </p>
      {acc_media !== undefined && (
        <p>
          Validação cruzada (5 folds): acc {formatarPct(acc_media)}
          {acc_desvio !== undefined && ` ± ${formatarPct(acc_desvio)}`}
          {f1_media !== undefined && ` · F1 ${formatarPct(f1_media)}`}
        </p>
      )}
      {SUSPEITA_VAZAMENTO[modelo.cancer] && (
        <p className="text-amber-700">Atenção: métrica possivelmente inflada por vazamento entre treino e teste.</p>
      )}
    </div>
  );
}
