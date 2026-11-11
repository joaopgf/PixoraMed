// Gera e baixa um arquivo CSV no formato do Excel em português (BOM, separador ";").
// rows: lista de linhas, cada uma uma lista de valores; a primeira linha é o cabeçalho.
export function downloadCsv(fileName, rows) {
  const csv =
    "﻿" + rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
