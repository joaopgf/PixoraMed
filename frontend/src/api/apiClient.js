// Cliente HTTP central: chama /api no mesmo endereço do site, envia o token do login e padroniza os erros.
// Em desenvolvimento o Vite repassa /api ao backend; na Vercel quem repassa é o vercel.json.

let currentToken = null;
let onUnauthorized = null;

// O AuthContext informa o token atual e o que fazer quando a API recusar o login (sessão vencida)
export function setSession(token, handleUnauthorized) {
  currentToken = token;
  onUnauthorized = handleUnauthorized;
}

export async function request(path, options = {}) {
  const headers = new Headers(options.headers);
  if (currentToken) headers.set("Authorization", `Bearer ${currentToken}`);

  const response = await fetch(path, { ...options, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    if (response.status === 401 && currentToken) onUnauthorized?.();
    throw new Error(
      body?.message ?? `Erro ${response.status} ao acessar a API`,
    );
  }
  // 204 (troca de senha, exclusão da conta) não tem corpo
  return response.status === 204 ? null : response.json();
}

// Envia um corpo JSON com o método escolhido (POST, PUT, PATCH ou DELETE)
export const sendJson = (method, path, body) =>
  request(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const postJson = (path, body) => sendJson("POST", path, body);
