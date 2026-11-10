// Configuração do Vite. Em desenvolvimento, as chamadas a /api vão para o backend definido em BACKEND_URL.
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // Lê o frontend/.env (BACKEND_URL não começa com VITE_, então não vai para o código do navegador)
  const env = { ...process.env, ...loadEnv(mode, process.cwd(), "") };
  return {
    plugins: [react()],
    server: {
      host: true,
      proxy: { "/api": env.BACKEND_URL || "http://localhost:8080" },
    },
  };
});
