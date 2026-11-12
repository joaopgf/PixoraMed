// Rede de segurança da interface: sem ela, um erro ao montar uma tela desmonta o app inteiro e deixa a página em branco.
// Mostra uma mensagem com "Recarregar a página" e "Voltar ao início". Fica no main.jsx (app inteiro) e no Layout
// (só o conteúdo, com o menu na tela); no Layout, resetKey (a rota) limpa o erro quando o usuário troca de página.
// Precisa ser classe: getDerivedStateFromError e componentDidCatch não existem em hooks.
// Não pega erro de clique, de código assíncrono nem de requisição: esses ficam com o apiClient e o QueryState.
import { Component } from "react";

import { isChunkLoadError, reloadOnce } from "../utils/staleChunk";

export default class ErrorBoundary extends Component {
  state = { error: null, reloading: false };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Tela de versão antiga depois de um deploy: recarregar resolve
    if (isChunkLoadError(error) && reloadOnce()) {
      this.setState({ reloading: true });
      return;
    }
    console.error(
      "Erro não tratado na interface:",
      error,
      info?.componentStack,
    );
  }

  componentDidUpdate(previous) {
    if (this.state.error && previous.resetKey !== this.props.resetKey) {
      this.setState({ error: null, reloading: false });
    }
  }

  render() {
    const { error, reloading } = this.state;
    if (!error) return this.props.children;

    if (reloading) {
      return (
        <div className="empty">Atualizando para a versão nova do site...</div>
      );
    }

    const outdated = isChunkLoadError(error);
    return (
      <div
        className={`error-boundary${this.props.fullPage ? " full-page" : ""}`}
        role="alert"
      >
        <div className="error-boundary-box">
          <h2>Algo deu errado nesta tela</h2>
          <p>
            {outdated
              ? "Não foi possível carregar esta tela. Pode ser a conexão ou uma versão nova do site. Recarregue a página para tentar de novo."
              : "A tela encontrou um erro inesperado e não conseguiu continuar. Suas análises já gravadas não foram afetadas."}
          </p>
          <div className="error-boundary-actions">
            <button
              type="button"
              className="btn primary"
              onClick={() => window.location.reload()}
            >
              Recarregar a página
            </button>
            <button
              type="button"
              className="btn secondary"
              onClick={() => window.location.assign("/")}
            >
              Voltar ao início
            </button>
          </div>
        </div>
      </div>
    );
  }
}
