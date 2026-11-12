// Hooks de leitura da API com cache (TanStack Query): modelos e histórico de análises.
import { useQuery } from "@tanstack/react-query";

import { predictionsApi } from "../api/predictionsApi";

export const useModels = () =>
  useQuery({ queryKey: ["models"], queryFn: predictionsApi.models });

export const usePredictionHistory = () =>
  useQuery({ queryKey: ["predictions"], queryFn: predictionsApi.history });
