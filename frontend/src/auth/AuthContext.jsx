// Estado do login: guarda o token no navegador, entrega o usuário logado e faz logout quando a sessão vence.
/* eslint-disable react-refresh/only-export-components -- o Provider e o hook ficam juntos de propósito */
import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { setSession } from "../api/apiClient";

const STORAGE_KEY = "pixoramed_session";

// "Manter conectado" guarda no localStorage; sem a opção, a sessão some ao fechar a aba (sessionStorage)
function storages() {
  try {
    return [localStorage, sessionStorage];
  } catch {
    return []; // navegador sem armazenamento: a sessão dura só até recarregar a página
  }
}

function readSession() {
  for (const storage of storages()) {
    try {
      const session = JSON.parse(storage.getItem(STORAGE_KEY) ?? "null");
      if (session?.token && Date.parse(session.expiresAt) > Date.now())
        return session;
      storage.removeItem(STORAGE_KEY);
    } catch {
      // valor corrompido: ignora
    }
  }
  return null;
}

function clearSession() {
  storages().forEach((storage) => storage.removeItem(STORAGE_KEY));
}

// "Manter conectado" foi marcado se a sessão está no localStorage
function isKept() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

function saveSession(session, keep) {
  clearSession();
  try {
    (keep ? localStorage : sessionStorage).setItem(
      STORAGE_KEY,
      JSON.stringify(session),
    );
  } catch {
    // sem armazenamento: a sessão dura só até recarregar a página
  }
}

// O token entra no cliente da API já no carregamento, antes da primeira consulta
const INITIAL_SESSION = readSession();
setSession(INITIAL_SESSION?.token ?? null, null);

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [session, setSessionState] = useState(INITIAL_SESSION);
  const [loginNotice, setLoginNotice] = useState("");

  // Limpa o token e o cache das consultas (histórico do usuário)
  const logout = useCallback(
    (notice = "") => {
      setSession(null, null);
      clearSession();
      queryClient.clear();
      setSessionState(null);
      setLoginNotice(notice);
    },
    [queryClient],
  );

  // Se a API recusar o token (sessão vencida), volta para o login com um aviso
  useEffect(() => {
    if (session)
      setSession(session.token, () =>
        logout("Sua sessão expirou. Entre novamente."),
      );
  }, [session, logout]);

  const value = useMemo(
    () => ({
      isLoggedIn: session !== null,
      user: session?.user ?? null,
      loginNotice,
      login: (newSession, keep) => {
        queryClient.clear();
        setSession(newSession.token, null);
        saveSession(newSession, keep);
        setSessionState(newSession);
        setLoginNotice("");
      },
      // Depois de editar a conta: troca o usuário guardado, mantendo o mesmo token
      updateUser: (user) => {
        const next = { ...session, user };
        saveSession(next, isKept());
        setSessionState(next);
      },
      logout,
    }),
    [session, loginNotice, logout, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth precisa estar dentro de AuthProvider");
  return auth;
}
