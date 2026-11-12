// Hooks de leitura da API com cache (TanStack Query): modelos e histórico de análises.
import { useQuery } from "@tanstack/react-query";

import { predictionsApi } from "../api/predictionsApi";

// Sem modelos (a IA pode estar acordando no Render), busca de novo a cada 10 s até a lista chegar
const MODELS_RETRY_MS = 10_000;

export const useModels = () =>
  useQuery({
    queryKey: ["models"],
    queryFn: predictionsApi.models,
    refetchInterval: (query) =>
      query.state.data?.length ? false : MODELS_RETRY_MS,
  });

export const usePredictionHistory = () =>
  useQuery({ queryKey: ["predictions"], queryFn: predictionsApi.history });
