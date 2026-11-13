// Limites dos campos da conta, iguais aos do backend (AccountRules.java). O backend valida de novo.
export const NAME_MAX = 255;
export const EMAIL_MIN = 6;
export const EMAIL_MAX = 254;
export const PASSWORD_MIN = 8;
// O BCrypt só usa os 72 primeiros bytes; letra com acento ocupa 2
export const PASSWORD_MAX_BYTES = 72;

// Mensagem de erro da senha nova, ou "" se ela estiver dentro das regras
export function passwordProblem(password, confirmation) {
  if (password.length < PASSWORD_MIN)
    return "A senha precisa ter pelo menos 8 caracteres.";
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES)
    return "A senha passa do limite de 72 bytes: letras com acento ou cedilha contam como 2.";
  if (password !== confirmation) return "As senhas não conferem.";
  return "";
}
