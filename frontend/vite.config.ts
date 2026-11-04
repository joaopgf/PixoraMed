import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    // Em desenvolvimento, /api vai para o FastAPI local
    proxy: { "/api": "http://localhost:8000" },
  },
});
