// Chamada dos treinos registrados (tela de resultados). Mostra só os tipos de câncer do catálogo.
import { MODULES } from "../utils/modules";
import { request } from "./apiClient";

const MODULE_IDS = new Set(MODULES.map((module) => module.id));

export const trainingsApi = {
  list: async () =>
    (await request("/api/trainings")).filter((training) =>
      MODULE_IDS.has(training.cancerType),
    ),
};
