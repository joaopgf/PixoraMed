// Ponto de entrada do React: liga o cache de consultas, o roteador, o login e o estado da análise.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { AnalysisProvider } from "./context/AnalysisContext";
import { reloadOnce } from "./utils/staleChunk";
import "./styles/index.css";

// O Vite avisa quando falha ao baixar o arquivo de uma tela (versão antiga depois de um deploy): recarrega uma vez.
// Se já recarregou há pouco, deixa o erro seguir para o ErrorBoundary mostrar a mensagem
window.addEventListener("vite:preloadError", (event) => {
  if (reloadOnce()) event.preventDefault();
});

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary fullPage>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <AnalysisProvider>
              <App />
            </AnalysisProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
