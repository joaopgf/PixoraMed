// Chamadas de autenticação: cadastro e login. As duas devolvem { token, expiresAt, user }.
import { postJson } from "./apiClient";

export const authApi = {
  register: (name, email, password) =>
    postJson("/api/auth/register", { name, email, password }),
  login: (email, password) => postJson("/api/auth/login", { email, password }),
};
