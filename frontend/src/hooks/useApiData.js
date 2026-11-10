// Hooks de leitura da API com cache (TanStack Query): modelos, treinos e histórico de análises.
import { useQuery } from "@tanstack/react-query";

import { predictionsApi } from "../api/predictionsApi";
import { trainingsApi } from "../api/trainingsApi";

export const useModels = () =>
  useQuery({ queryKey: ["models"], queryFn: predictionsApi.models });

export const useTrainings = () =>
  useQuery({ queryKey: ["trainings"], queryFn: trainingsApi.list });

export const usePredictionHistory = () =>
  useQuery({ queryKey: ["predictions"], queryFn: predictionsApi.history });
