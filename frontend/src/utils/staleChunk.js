// Recarga depois de um deploy: as telas internas são arquivos com nome novo a cada versão (React.lazy).
// Quem estava com o site aberto pede o arquivo antigo, que não existe mais, e o carregamento falha.
// Recarregar a página traz a versão nova. A recarga acontece no máximo uma vez a cada 10 s, para não entrar em ciclo.

const STORAGE_KEY = "pixoramed_chunk_reload_at";
const MIN_INTERVAL_MS = 10_000;

// Mensagens dos navegadores quando um import dinâmico falha (Chrome, Firefox e Safari)
const CHUNK_ERROR =
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|is not a valid JavaScript MIME type/i;

export const isChunkLoadError = (error) =>
  CHUNK_ERROR.test(String(error?.message ?? error ?? ""));

// Recarrega a página e devolve true; devolve false se já recarregou há pouco (o erro então aparece na tela)
export function reloadOnce() {
  try {
    const last = Number(sessionStorage.getItem(STORAGE_KEY) ?? 0);
    if (Date.now() - last < MIN_INTERVAL_MS) return false;
    sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    // Sem sessionStorage (modo privado restrito), não há como evitar o ciclo: mostra o erro
    return false;
  }
  window.location.reload();
  return true;
}
