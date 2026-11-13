// Chamadas da conta do usuário logado: editar nome e e-mail, trocar a senha e excluir a conta.
import { sendJson } from "./apiClient";

export const usersApi = {
  // Devolve o usuário atualizado ({ id, name, email, createdAt })
  update: (name, email) => sendJson("PUT", "/api/users/me", { name, email }),
  changePassword: (currentPassword, newPassword) =>
    sendJson("PATCH", "/api/users/me/password", {
      currentPassword,
      newPassword,
    }),
  remove: (password) => sendJson("DELETE", "/api/users/me", { password }),
};
