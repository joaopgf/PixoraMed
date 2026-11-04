import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import type { ResultadoPrevisao } from "./api";

export type Analise = {
  moduloId: string;
  modeloId: string;
  codigoCaso: string;
  consentimento: boolean;
  arquivo: File | null;
  arquivoUrl: string | null;
};

// Só vale nesta sessão do navegador: a imagem e as probabilidades não são guardadas no banco
export type UltimoResultado = ResultadoPrevisao & {
  criadoEm: string;
  codigoCaso: string;
  arquivoNome: string;
  arquivoUrl: string | null;
};

const ANALISE_VAZIA: Analise = { moduloId: "", modeloId: "", codigoCaso: "", consentimento: false, arquivo: null, arquivoUrl: null };
const CHAVE_SESSAO = "pixoramed_demo_session";

function lerSessao() {
  try {
    return sessionStorage.getItem(CHAVE_SESSAO) === "true";
  } catch {
    return false;
  }
}

type Estado = {
  logado: boolean;
  entrar: () => void;
  sair: () => void;
  moduloPendente: string | null;
  setModuloPendente: (id: string | null) => void;
  analise: Analise;
  iniciarAnalise: (moduloId: string) => void;
  atualizarAnalise: (dados: Partial<Analise>) => void;
  definirArquivo: (arquivo: File | null) => void;
  ultimoResultado: UltimoResultado | null;
  setUltimoResultado: (resultado: UltimoResultado | null) => void;
};

const Contexto = createContext<Estado | null>(null);

export function EstadoProvider({ children }: { children: ReactNode }) {
  const [logado, setLogado] = useState(lerSessao);
  const [moduloPendente, setModuloPendente] = useState<string | null>(null);
  const [analise, setAnalise] = useState<Analise>(ANALISE_VAZIA);
  const [ultimoResultado, setUltimoResultado] = useState<UltimoResultado | null>(null);

  const liberarImagem = useCallback((url: string | null) => {
    if (url) URL.revokeObjectURL(url);
  }, []);

  const definirArquivo = useCallback(
    (arquivo: File | null) => {
      setAnalise((atual) => {
        liberarImagem(atual.arquivoUrl);
        return { ...atual, arquivo, arquivoUrl: arquivo ? URL.createObjectURL(arquivo) : null };
      });
    },
    [liberarImagem],
  );

  const iniciarAnalise = useCallback(
    (moduloId: string) => {
      setAnalise((atual) => {
        liberarImagem(atual.arquivoUrl);
        return { ...ANALISE_VAZIA, moduloId };
      });
      setUltimoResultado(null);
    },
    [liberarImagem],
  );

  const valor = useMemo<Estado>(
    () => ({
      logado,
      entrar: () => {
        setLogado(true);
        try {
          sessionStorage.setItem(CHAVE_SESSAO, "true");
        } catch {
          // Sem sessionStorage a sessão dura só até recarregar a página
        }
      },
      sair: () => {
        setLogado(false);
        try {
          sessionStorage.removeItem(CHAVE_SESSAO);
        } catch {
          // Nada a limpar
        }
        iniciarAnalise("");
      },
      moduloPendente,
      setModuloPendente,
      analise,
      iniciarAnalise,
      atualizarAnalise: (dados) => setAnalise((atual) => ({ ...atual, ...dados })),
      definirArquivo,
      ultimoResultado,
      setUltimoResultado,
    }),
    [logado, moduloPendente, analise, iniciarAnalise, definirArquivo, ultimoResultado],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useEstado() {
  const estado = useContext(Contexto);
  if (!estado) throw new Error("useEstado precisa estar dentro de EstadoProvider");
  return estado;
}
