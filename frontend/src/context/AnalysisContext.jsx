// Estado da análise em andamento (módulo, modelo, imagem, consentimento) e do último resultado.
// Só vale nesta aba do navegador: a imagem e as probabilidades não são guardadas no banco.
/* eslint-disable react-refresh/only-export-components -- o Provider e o hook ficam juntos de propósito */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "../auth/AuthContext";

const EMPTY_ANALYSIS = {
  moduleId: "",
  modelId: "",
  caseCode: "",
  consent: false,
  file: null,
  fileUrl: null,
};

const AnalysisContext = createContext(null);

export function AnalysisProvider({ children }) {
  const { isLoggedIn } = useAuth();
  // Módulo escolhido na página inicial antes do login; abre depois de entrar
  const [pendingModule, setPendingModule] = useState(null);
  const [analysis, setAnalysis] = useState(EMPTY_ANALYSIS);
  const [lastResult, setLastResult] = useState(null);

  // O endereço da prévia é criado fora do setAnalysis: o React pode rodar essa função duas vezes
  const setFile = useCallback((file) => {
    const fileUrl = file ? URL.createObjectURL(file) : null;
    setAnalysis((current) => ({ ...current, file, fileUrl }));
  }, []);

  const startAnalysis = useCallback((moduleId) => {
    setAnalysis({ ...EMPTY_ANALYSIS, moduleId });
    setLastResult(null);
  }, []);

  // Libera o endereço antigo da prévia só depois que a tela já trocou de imagem.
  // Liberar antes fazia o navegador tentar carregar um arquivo que não existe mais (ERR_FILE_NOT_FOUND).
  useEffect(() => {
    const fileUrl = analysis.fileUrl;
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
    };
  }, [analysis.fileUrl]);

  // Ao sair da conta, descarta a análise em andamento
  useEffect(() => {
    if (!isLoggedIn) startAnalysis("");
  }, [isLoggedIn, startAnalysis]);

  const value = useMemo(
    () => ({
      pendingModule,
      setPendingModule,
      analysis,
      startAnalysis,
      updateAnalysis: (data) =>
        setAnalysis((current) => ({ ...current, ...data })),
      setFile,
      lastResult,
      setLastResult,
    }),
    [pendingModule, analysis, startAnalysis, setFile, lastResult],
  );

  return (
    <AnalysisContext.Provider value={value}>
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis() {
  const analysis = useContext(AnalysisContext);
  if (!analysis)
    throw new Error("useAnalysis precisa estar dentro de AnalysisProvider");
  return analysis;
}
