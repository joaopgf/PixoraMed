// Histórico de análises do usuário: cards de resumo, busca, filtro por módulo, paginação e exportação para CSV.
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { PageHeader } from "../components/common";
import HistorySummary from "../components/HistorySummary";
import Icon from "../components/Icon";
import LowConfidenceTag from "../components/LowConfidenceTag";
import { useModels, usePredictionHistory } from "../hooks/useApiData";
import { downloadCsv } from "../utils/exportCsv";
import {
  className,
  formatDate,
  formatPercent,
  modeName,
  MODULES,
  parseModelId,
  recordCode,
} from "../utils/modules";
import { isLowConfidence } from "../utils/resultView";

const ITEMS_PER_PAGE = 10;

function exportCsv(records) {
  const rows = [
    [
      "Identificador",
      "Modulo",
      "Modelo",
      "Classe prevista",
      "Confianca (%)",
      "Data",
      "Tempo (ms)",
    ],
    ...records.map((record) => [
      recordCode(record.id),
      parseModelId(record.modelId).module?.name ?? "",
      record.modelId,
      className(record.predictedClass),
      (record.confidence * 100).toFixed(2).replace(".", ","),
      formatDate(record.createdAt),
      record.timeMs.toFixed(0),
    ]),
  ];
  downloadCsv("pixoramed-historico.csv", rows);
}

export default function History() {
  const navigate = useNavigate();
  const history = usePredictionHistory();
  const models = useModels();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (history.data ?? []).filter((record) => {
      const { module } = parseModelId(record.modelId);
      const text =
        `${recordCode(record.id)} ${module?.name ?? ""} ${record.modelId} ${className(record.predictedClass)}`.toLowerCase();
      return text.includes(term) && (filter === "all" || module?.id === filter);
    });
  }, [history.data, search, filter]);

  const totalPages = Math.max(1, Math.ceil(visible.length / ITEMS_PER_PAGE));
  // A lista pode encolher ao recarregar os dados, então a página nunca passa da última
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageRecords = visible.slice(start, start + ITEMS_PER_PAGE);

  return (
    <>
      <PageHeader
        label="ACOMPANHAMENTO"
        title="Histórico de análises"
        description="Previsões registradas no banco. A imagem nunca é guardada: só o modelo, a classe, a confiança e o horário."
      />
      {history.data && (
        <HistorySummary records={history.data} models={models.data} />
      )}
      <div className="history-actions">
        <button
          type="button"
          className="btn secondary"
          disabled={!visible.length}
          onClick={() => exportCsv(visible)}
        >
          <Icon name="file" /> Exportar CSV
        </button>
        <button
          type="button"
          className="btn primary"
          onClick={() => navigate("/new-analysis")}
        >
          <Icon name="plusfile" /> Nova análise
        </button>
      </div>
      <section className="panel">
        <div className="history-tools">
          <div>
            <h3 style={{ margin: "0 0 4px" }}>Registros</h3>
            <p className="muted tiny" style={{ margin: 0 }}>
              As 100 análises mais recentes.
            </p>
          </div>
          <div className="searchbar">
            <Icon name="search" />
            <input
              type="search"
              aria-label="Buscar no histórico"
              placeholder="Buscar por código, módulo ou classe..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            className="select-inline"
            aria-label="Filtrar por módulo"
            value={filter}
            onChange={(event) => {
              setFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="all">Todos os módulos</option>
            {MODULES.map((module) => (
              <option key={module.id} value={module.id}>
                {module.name}
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
              {pageRecords.map((record) => {
                const { module, mode } = parseModelId(record.modelId);
                return (
                  <tr key={record.id}>
                    <td>
                      <strong>{recordCode(record.id)}</strong>
                      <br />
                      <span className="tiny muted">{record.modelId}</span>
                    </td>
                    <td>
                      {module?.name ?? record.modelId}
                      <br />
                      <span className="tiny muted">{modeName(mode)}</span>
                    </td>
                    <td>
                      <span className="table-status neutral">
                        {className(record.predictedClass)}
                      </span>
                      {isLowConfidence(record, models.data) && (
                        <LowConfidenceTag />
                      )}
                    </td>
                    <td className="mono">
                      {formatPercent(record.confidence * 100)}
                    </td>
                    <td>{formatDate(record.createdAt)}</td>
                    <td>
                      <button
                        type="button"
                        className="table-action"
                        onClick={() => navigate(`/result/${record.id}`)}
                      >
                        Abrir →
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!visible.length && (
                <tr>
                  <td colSpan={6}>
                    {history.isLoading
                      ? "Carregando..."
                      : history.isError
                        ? `Não foi possível carregar: ${history.error.message}`
                        : history.data?.length
                          ? "Nenhum registro encontrado com esse filtro."
                          : "Nenhuma análise feita ainda."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <nav className="pagination" aria-label="Paginação do histórico">
            <span className="pagination-summary">
              Mostrando {start + 1}–{start + pageRecords.length} de{" "}
              {visible.length}
            </span>
            <div className="pagination-controls">
              <button
                type="button"
                className="btn secondary"
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
              >
                ← Anterior
              </button>
              <span className="mono" aria-current="page">
                Página {currentPage} de {totalPages}
              </span>
              <button
                type="button"
                className="btn secondary"
                disabled={currentPage === totalPages}
                onClick={() => setPage(currentPage + 1)}
              >
                Próxima →
              </button>
            </div>
          </nav>
        )}
      </section>
    </>
  );
}
