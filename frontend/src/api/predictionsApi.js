// Chamadas das análises: modelos disponíveis, nova análise (envio da imagem) e histórico do usuário.
import { request } from "./apiClient";

export const predictionsApi = {
  models: () => request("/api/models"),
  history: () => request("/api/predictions?limit=100"),
  predict: (modelId, file) => {
    const form = new FormData();
    form.append("modelId", modelId);
    form.append("file", file);
    return request("/api/predictions", { method: "POST", body: form });
  },
};
