import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api, type RegistroPrevisao } from "../api";
import { formatarPct } from "../dados";
import { CabecalhoPagina } from "../components/Estrutura";
import Icone from "../components/Icone";
import { codigoRegistro, formatarData, lerModeloId, MODULOS, nomeClasse, nomeModo } from "../modulos";

function exportarCsv(registros: RegistroPrevisao[]) {
  const linhas = [
    ["Identificador", "Modulo", "Modelo", "Classe prevista", "Confianca (%)", "Data", "Tempo (ms)"],
    ...registros.map((registro) => [
      codigoRegistro(registro.id),
      lerModeloId(registro.modelo_id).modulo?.nome ?? "",
      registro.modelo_id,
      nomeClasse(registro.classe_prevista),
      (registro.confianca * 100).toFixed(2).replace(".", ","),
      formatarData(registro.criado_em),
      registro.tempo_ms.toFixed(0),
    ]),
  ];
  // BOM e ";" para abrir direto no Excel em português
  const csv = "﻿" + linhas.map((linha) => linha.map((valor) => `"${String(valor).replace(/"/g, '""')}"`).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "pixoramed-historico.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export default function Historico() {
  const navegar = useNavigate();
  const previsoes = useQuery({ queryKey: ["previsoes"], queryFn: api.previsoes });
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (previsoes.data ?? []).filter((registro) => {
      const { modulo } = lerModeloId(registro.modelo_id);
      const texto = `${codigoRegistro(registro.id)} ${modulo?.nome ?? ""} ${registro.modelo_id} ${nomeClasse(registro.classe_prevista)}`.toLowerCase();
      return texto.includes(termo) && (filtro === "todos" || modulo?.id === filtro);
    });
  }, [previsoes.data, busca, filtro]);

  return (
    <>
      <CabecalhoPagina
        rotulo="ACOMPANHAMENTO"
        titulo="Histórico de análises"
        descricao="Previsões registradas no banco. A imagem nunca é guardada: só o modelo, a classe, a confiança e o horário."
        acoes={
          <>
            <button type="button" className="btn secondary" disabled={!visiveis.length} onClick={() => exportarCsv(visiveis)}>
              <Icone nome="file" /> Exportar CSV
            </button>
            <button type="button" className="btn primary" onClick={() => navegar("/nova")}>
              <Icone nome="plusfile" /> Nova análise
            </button>
          </>
        }
      />
      <section className="panel">
        <div className="history-tools">
          <div>
            <h3 style={{ margin: "0 0 4px", fontSize: 14 }}>Registros</h3>
            <p className="muted tiny" style={{ margin: 0 }}>
              As 100 análises mais recentes.
            </p>
          </div>
          <div className="searchbar">
            <Icone nome="search" />
            <input
              type="search"
              aria-label="Buscar no histórico"
              placeholder="Buscar por código, módulo ou classe..."
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
            />
          </div>
          <select className="select-inline" aria-label="Filtrar por módulo" value={filtro} onChange={(evento) => setFiltro(evento.target.value)}>
            <option value="todos">Todos os módulos</option>
            {MODULOS.map((modulo) => (
              <option key={modulo.id} value={modulo.id}>
                {modulo.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Identificador</th>
                <th>Módulo</th>
                <th>Classe prevista</th>
                <th>Confiança</th>
                <th>Data</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((registro) => {
                const { modulo, modo } = lerModeloId(registro.modelo_id);
                return (
                  <tr key={registro.id}>
                    <td>
                      <strong>{codigoRegistro(registro.id)}</strong>
                      <br />
                      <span className="tiny muted">{registro.modelo_id}</span>
                    </td>
                    <td>
                      {modulo?.nome ?? registro.modelo_id}
                      <br />
                      <span className="tiny muted">{nomeModo(modo)}</span>
                    </td>
                    <td>
                      <span className="table-status neutral">{nomeClasse(registro.classe_prevista)}</span>
                    </td>
                    <td className="mono">{formatarPct(registro.confianca * 100)}</td>
                    <td>{formatarData(registro.criado_em)}</td>
                    <td>
                      <button type="button" className="table-action" onClick={() => navegar(`/resultado/${registro.id}`)}>
                        Abrir →
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!visiveis.length && (
                <tr>
                  <td colSpan={6}>
                    {previsoes.isLoading
                      ? "Carregando..."
                      : previsoes.isError
                        ? `Não foi possível carregar: ${previsoes.error.message}`
                        : previsoes.data?.length
                          ? "Nenhum registro encontrado com esse filtro."
                          : "Nenhuma análise feita ainda."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
