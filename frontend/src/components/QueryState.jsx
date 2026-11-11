// Mensagem padrão de carregando, erro ou lista vazia de uma consulta da API (TanStack Query).
// Mostra nada quando há dados; a tela desenha o conteúdo normalmente.
export default function QueryState({ query, emptyText, errorPrefix = "Não foi possível carregar", className = "empty" }) {
  if (query.isLoading) return <div className={className}>Carregando...</div>;
  if (query.isError) return <div className={className}>{`${errorPrefix}: ${query.error.message}`}</div>;
  if (emptyText && Array.isArray(query.data) && query.data.length === 0) {
    return <div className={className}>{emptyText}</div>;
  }
  return null;
}
