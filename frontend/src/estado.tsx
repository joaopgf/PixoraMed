import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  api,
  configurarSessao,
  type ResultadoPrevisao,
  type SessaoLogin,
  type Usuario,
} from "./api";

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

const ANALISE_VAZIA: Analise = {
  moduloId: "",
  modeloId: "",
  codigoCaso: "",
  consentimento: false,
  arquivo: null,
  arquivoUrl: null,
};
const CHAVE_SESSAO = "pixoramed_sessao";

// "Manter conectado" guarda no localStorage; sem a opção, a sessão some ao fechar a aba (sessionStorage)
function armazenamentos(): Storage[] {
  const lista: Storage[] = [];
  try {
    lista.push(localStorage, sessionStorage);
  } catch {
    // Navegador sem armazenamento: a sessão dura só até recarregar a página
  }
  return lista;
}

function lerSessao(): SessaoLogin | null {
  for (const armazenamento of armazenamentos()) {
    try {
      const sessao = JSON.parse(
        armazenamento.getItem(CHAVE_SESSAO) ?? "null",
      ) as SessaoLogin | null;
      // A API grava em UTC sem fuso
      const expira =
        sessao &&
        Date.parse(
          sessao.expira_em.endsWith("Z")
            ? sessao.expira_em
            : `${sessao.expira_em}Z`,
        );
      if (sessao?.token && expira && expira > Date.now()) return sessao;
      armazenamento.removeItem(CHAVE_SESSAO);
    } catch {
      // Valor corrompido: ignora
    }
  }
  return null;
}

function apagarSessao() {
  for (const armazenamento of armazenamentos()) {
    try {
      armazenamento.removeItem(CHAVE_SESSAO);
    } catch {
      // Nada a apagar
    }
  }
}

function gravarSessao(sessao: SessaoLogin, manter: boolean) {
  apagarSessao();
  try {
    (manter ? localStorage : sessionStorage).setItem(
      CHAVE_SESSAO,
      JSON.stringify(sessao),
    );
  } catch {
    // Sem armazenamento: a sessão dura só até recarregar a página
  }
}

// O token entra no cliente da API já no carregamento, antes da primeira consulta
const SESSAO_INICIAL = lerSessao();
configurarSessao(SESSAO_INICIAL?.token ?? null, null);

type Estado = {
  logado: boolean;
  usuario: Usuario | null;
  entrar: (sessao: SessaoLogin, manter: boolean) => void;
  sair: () => void;
  avisoLogin: string;
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
  const queryClient = useQueryClient();
  const [sessao, setSessao] = useState<SessaoLogin | null>(SESSAO_INICIAL);
  const [avisoLogin, setAvisoLogin] = useState("");
  const [moduloPendente, setModuloPendente] = useState<string | null>(null);
  const [analise, setAnalise] = useState<Analise>(ANALISE_VAZIA);
  const [ultimoResultado, setUltimoResultado] =
    useState<UltimoResultado | null>(null);

  const liberarImagem = useCallback((url: string | null) => {
    if (url) URL.revokeObjectURL(url);
  }, []);

  const definirArquivo = useCallback(
    (arquivo: File | null) => {
      setAnalise((atual) => {
        liberarImagem(atual.arquivoUrl);
        return {
          ...atual,
          arquivo,
          arquivoUrl: arquivo ? URL.createObjectURL(arquivo) : null,
        };
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

  // Limpa tudo o que é do usuário: token, cache das consultas (histórico) e a análise em andamento
  const encerrar = useCallback(
    (aviso: string) => {
      configurarSessao(null, null);
      apagarSessao();
      queryClient.clear();
      iniciarAnalise("");
      setSessao(null);
      setAvisoLogin(aviso);
    },
    [queryClient, iniciarAnalise],
  );

  // Se a API recusar o token (sessão vencida ou apagada), volta para o login com um aviso
  useEffect(() => {
    if (sessao)
      configurarSessao(sessao.token, () =>
        encerrar("Sua sessão expirou. Entre novamente."),
      );
  }, [sessao, encerrar]);

  const valor = useMemo<Estado>(
    () => ({
      logado: sessao !== null,
      usuario: sessao?.usuario ?? null,
      entrar: (nova, manter) => {
        queryClient.clear();
        configurarSessao(nova.token, null);
        gravarSessao(nova, manter);
        setSessao(nova);
        setAvisoLogin("");
      },
      sair: () => {
        // Apaga a sessão no servidor; mesmo se falhar, o navegador esquece o token
        api.sair().catch(() => undefined);
        encerrar("");
      },
      avisoLogin,
      moduloPendente,
      setModuloPendente,
      analise,
      iniciarAnalise,
      atualizarAnalise: (dados) =>
        setAnalise((atual) => ({ ...atual, ...dados })),
      definirArquivo,
      ultimoResultado,
      setUltimoResultado,
    }),
    [
      sessao,
      avisoLogin,
      encerrar,
      queryClient,
      moduloPendente,
      analise,
      iniciarAnalise,
      definirArquivo,
      ultimoResultado,
    ],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useEstado() {
  const estado = useContext(Contexto);
  if (!estado)
    throw new Error("useEstado precisa estar dentro de EstadoProvider");
  return estado;
}
