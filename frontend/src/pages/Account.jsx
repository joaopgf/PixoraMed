// Tela da conta: dados do usuário, edição de nome e e-mail, troca de senha, exclusão da conta e o botão de sair.
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { usersApi } from "../api/usersApi";
import { useAuth } from "../auth/AuthContext";
import { Alert, PageHeader } from "../components/common";
import Icon from "../components/Icon";
import InfoPair from "../components/InfoPair";
import {
  EMAIL_MAX,
  EMAIL_MIN,
  NAME_MAX,
  PASSWORD_MIN,
  passwordProblem,
} from "../utils/accountRules";
import { formatDate, initials } from "../utils/modules";

// Estado de envio de cada formulário: mensagem de erro, de sucesso e se está enviando
const IDLE = { error: "", success: "", sending: false };

export default function Account() {
  const navigate = useNavigate();
  const { logout, updateUser, user } = useAuth();

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [profileState, setProfileState] = useState(IDLE);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [passwordState, setPasswordState] = useState(IDLE);

  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [deleteState, setDeleteState] = useState(IDLE);

  async function saveProfile(event) {
    event.preventDefault();
    setProfileState({ ...IDLE, sending: true });
    try {
      const updated = await usersApi.update(name, email);
      updateUser(updated);
      setName(updated.name);
      setEmail(updated.email);
      setProfileState({ ...IDLE, success: "Dados atualizados." });
    } catch (failure) {
      setProfileState({ ...IDLE, error: failure.message });
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    const problem = passwordProblem(newPassword, confirmation);
    if (problem) return setPasswordState({ ...IDLE, error: problem });
    setPasswordState({ ...IDLE, sending: true });
    try {
      await usersApi.changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      setPasswordState({ ...IDLE, success: "Senha alterada." });
    } catch (failure) {
      setPasswordState({ ...IDLE, error: failure.message });
    }
  }

  async function deleteAccount(event) {
    event.preventDefault();
    setDeleteState({ ...IDLE, sending: true });
    try {
      await usersApi.remove(deletePassword);
      logout("Sua conta foi excluída.");
      navigate("/login", { replace: true });
    } catch (failure) {
      setDeleteState({ ...IDLE, error: failure.message });
    }
  }

  const profileChanged =
    name.trim() !== user?.name || email.trim().toLowerCase() !== user?.email;

  return (
    <>
      <PageHeader
        label="PREFERÊNCIAS"
        title="Conta e segurança"
        description="Veja e altere os dados da sua conta na PixoraMed."
      />
      <div className="account-grid">
        <div className="account-column">
          <section className="profile-card">
            <div className="profile-hero">
              <span className="avatar large">{initials(user?.name ?? "")}</span>
              <div>
                <h3>{user?.name}</h3>
                <p>Conta da PixoraMed</p>
              </div>
            </div>
            <InfoPair label="E-mail">{user?.email}</InfoPair>
            <InfoPair label="Conta criada em">
              {user ? formatDate(user.createdAt) : ""}
            </InfoPair>
            <InfoPair label="Permissão">Análises e histórico próprio</InfoPair>
            <button
              type="button"
              className="btn secondary"
              style={{ marginTop: 18, width: "100%" }}
              onClick={() => {
                logout();
                navigate("/");
              }}
            >
              Sair da conta <Icon name="logout" />
            </button>
          </section>

          <section className="profile-card danger-zone">
            <h3>Excluir conta</h3>
            <p className="card-text">
              Apaga a conta e todo o histórico de análises. Não dá para
              desfazer.
            </p>
            <form className="auth-form" onSubmit={deleteAccount}>
              <div className="field">
                <label htmlFor="deletePassword">Senha atual</label>
                <input
                  id="deletePassword"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={deletePassword}
                  onChange={(event) => setDeletePassword(event.target.value)}
                />
              </div>
              <label className="checkline">
                <input
                  type="checkbox"
                  checked={deleteConfirmed}
                  onChange={(event) => setDeleteConfirmed(event.target.checked)}
                />{" "}
                Entendo que a conta e o histórico serão apagados para sempre.
              </label>
              <div className="form-error" role="alert">
                {deleteState.error}
              </div>
              <button
                type="submit"
                className="btn danger"
                disabled={!deleteConfirmed || deleteState.sending}
              >
                {deleteState.sending ? "Excluindo..." : "Excluir minha conta"}
              </button>
            </form>
          </section>
        </div>

        <div className="account-column">
          <section className="profile-card">
            <h3>Dados da conta</h3>
            <form className="auth-form" onSubmit={saveProfile}>
              <div className="field">
                <label htmlFor="accountName">Nome</label>
                <input
                  id="accountName"
                  required
                  minLength={2}
                  maxLength={NAME_MAX}
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="accountEmail">E-mail</label>
                <input
                  id="accountEmail"
                  type="email"
                  required
                  minLength={EMAIL_MIN}
                  maxLength={EMAIL_MAX}
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                <span className="hint">
                  O novo e-mail passa a ser usado no login.
                </span>
              </div>
              <FormStatus state={profileState} />
              <button
                type="submit"
                className="btn primary"
                disabled={!profileChanged || profileState.sending}
              >
                {profileState.sending ? "Salvando..." : "Salvar dados"}
              </button>
            </form>
          </section>

          <section className="profile-card">
            <h3>Trocar senha</h3>
            <form className="auth-form" onSubmit={changePassword}>
              <div className="field">
                <label htmlFor="currentPassword">Senha atual</label>
                <input
                  id="currentPassword"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="newPassword">Nova senha</label>
                <input
                  id="newPassword"
                  type="password"
                  required
                  minLength={PASSWORD_MIN}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
                <span className="hint">
                  Pelo menos 8 caracteres e no máximo 72 bytes (letras com
                  acento contam como 2).
                </span>
              </div>
              <div className="field">
                <label htmlFor="confirmPassword">Confirmar nova senha</label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                />
              </div>
              <FormStatus state={passwordState} />
              <button
                type="submit"
                className="btn primary"
                disabled={passwordState.sending}
              >
                {passwordState.sending ? "Salvando..." : "Trocar senha"}
              </button>
            </form>
          </section>
        </div>
      </div>
    </>
  );
}

// Erro em vermelho ou confirmação em verde, logo acima do botão
function FormStatus({ state }) {
  if (state.success)
    return (
      <Alert type="success" icon="shield">
        {state.success}
      </Alert>
    );
  return (
    <div className="form-error" role="alert">
      {state.error}
    </div>
  );
}
