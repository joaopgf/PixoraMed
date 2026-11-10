// Tela de login e de cadastro (abas "Entrar" e "Criar conta").
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { authApi } from "../api/authApi";
import { useAuth } from "../auth/AuthContext";
import Brand from "../components/Brand";
import { Alert } from "../components/common";
import Icon from "../components/Icon";
import OrganVisual from "../components/OrganVisual";
import { useAnalysis } from "../context/AnalysisContext";

export default function Login() {
  const navigate = useNavigate();
  const { isLoggedIn, login, loginNotice } = useAuth();
  const { pendingModule, setPendingModule } = useAnalysis();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  if (isLoggedIn && !sending) return <Navigate to="/dashboard" replace />;

  function switchTab(register) {
    setIsRegister(register);
    setError("");
    setPassword("");
    setConfirmation("");
  }

  async function submit(event) {
    event.preventDefault();
    if (isRegister && password !== confirmation) return setError("As senhas não conferem.");
    setError("");
    setSending(true);
    try {
      const session = isRegister
        ? await authApi.register(name, email, password)
        : await authApi.login(email, password);
      login(session, keepLoggedIn);
      if (pendingModule) {
        setPendingModule(null);
        navigate(`/analysis/${pendingModule}`, { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (failure) {
      setError(failure.message || "Não foi possível entrar.");
      setSending(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-story">
        <Brand />
        <div style={{ marginTop: 42 }} className="eyebrow">
          PROJETO ACADÊMICO
        </div>
        <h1>Uma experiência integrada para análise de imagens.</h1>
        <p>
          Selecione o módulo, carregue uma imagem, revise os dados e veja a
          resposta do modelo treinado pelo grupo.
        </p>
        <div className="auth-mini-visual">
          <OrganVisual />
        </div>
      </section>

      <section className="auth-card">
        <div className="seg" role="tablist" aria-label="Entrar ou criar conta" style={{ marginBottom: 18 }}>
          <button
            type="button"
            role="tab"
            aria-selected={!isRegister}
            className={isRegister ? "" : "active"}
            onClick={() => switchTab(false)}
          >
            Entrar
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isRegister}
            className={isRegister ? "active" : ""}
            onClick={() => switchTab(true)}
          >
            Criar conta
          </button>
        </div>
        <h2>{isRegister ? "Criar conta na PixoraMed" : "Acessar a PixoraMed"}</h2>
        <p>
          {isRegister
            ? "Cadastre-se para fazer análises e manter o seu histórico."
            : "Entre com o e-mail e a senha da sua conta."}
        </p>

        {loginNotice && !isRegister && (
          <div style={{ marginBottom: 15 }}>
            <Alert type="info">{loginNotice}</Alert>
          </div>
        )}

        <form className="auth-form" onSubmit={submit}>
          {isRegister && (
            <div className="field">
              <label htmlFor="registerName">Nome</label>
              <div className="input-icon">
                <Icon name="user" />
                <input
                  id="registerName"
                  required
                  minLength={2}
                  maxLength={80}
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
            </div>
          )}
          <div className="field">
            <label htmlFor="loginEmail">E-mail</label>
            <div className="input-icon">
              <Icon name="user" />
              <input
                id="loginEmail"
                type="email"
                required
                maxLength={254}
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="loginPassword">Senha</label>
            <div className="input-icon">
              <Icon name="lock" />
              <input
                id="loginPassword"
                type="password"
                required
                minLength={isRegister ? 8 : undefined}
                maxLength={128}
                autoComplete={isRegister ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            {isRegister && <span className="hint">Pelo menos 8 caracteres.</span>}
          </div>
          {isRegister && (
            <div className="field">
              <label htmlFor="registerConfirmation">Confirmar senha</label>
              <div className="input-icon">
                <Icon name="lock" />
                <input
                  id="registerConfirmation"
                  type="password"
                  required
                  maxLength={128}
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                />
              </div>
            </div>
          )}
          <label className="checkline">
            <input
              type="checkbox"
              checked={keepLoggedIn}
              onChange={(event) => setKeepLoggedIn(event.target.checked)}
            />{" "}
            Manter conectado neste navegador
          </label>
          <div className="form-error" role="alert">
            {error}
          </div>
          <button type="submit" className="btn primary" disabled={sending}>
            {sending ? "Aguarde..." : isRegister ? "Criar conta" : "Entrar"} <Icon name="arrow" />
          </button>
        </form>
        <div className="auth-divider">OU</div>
        <button type="button" className="btn secondary" onClick={() => navigate("/")}>
          Voltar à página inicial
        </button>
        <p className="auth-foot">
          Projeto acadêmico: não use a mesma senha de outros serviços. A senha é
          guardada só como hash (BCrypt) e o login vale por 8 horas.
        </p>
      </section>
    </main>
  );
}
