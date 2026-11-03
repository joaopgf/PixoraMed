import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Em desenvolvimento, /api vai para o FastAPI local
    proxy: { "/api": "http://localhost:8000" },
  },
});
