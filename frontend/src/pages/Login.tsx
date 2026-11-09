import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { api } from "../api";
import { Alerta } from "../components/Estrutura";
import Icone from "../components/Icone";
import Marca from "../components/Marca";
import VisualOrgaos from "../components/VisualOrgaos";
import { useEstado } from "../estado";

type Modo = "entrar" | "cadastro";

export default function Login() {
  const navegar = useNavigate();
  const { logado, entrar, avisoLogin, moduloPendente, setModuloPendente } = useEstado();
  const [modo, setModo] = useState<Modo>("entrar");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [manter, setManter] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (logado && !enviando) return <Navigate to="/painel" replace />;

  function trocarModo(novo: Modo) {
    setModo(novo);
    setErro("");
    setSenha("");
    setConfirmacao("");
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (modo === "cadastro" && senha !== confirmacao) return setErro("As senhas não conferem.");
    setErro("");
    setEnviando(true);
    try {
      const sessao = modo === "cadastro" ? await api.cadastrar(nome, email, senha) : await api.entrar(email, senha);
      entrar(sessao, manter);
      if (moduloPendente) {
        setModuloPendente(null);
        navegar(`/analise/${moduloPendente}`, { replace: true });
      } else {
        navegar("/painel", { replace: true });
      }
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível entrar.");
      setEnviando(false);
    }
  }

  const cadastro = modo === "cadastro";

  return (
    <main className="auth-page">
      <section className="auth-story">
        <Marca />
        <div style={{ marginTop: 42 }} className="eyebrow">
          PROJETO ACADÊMICO
        </div>
        <h1>Uma experiência integrada para análise de imagens.</h1>
        <p>Selecione o módulo, carregue uma imagem, revise os dados e veja a resposta do modelo treinado pelo grupo.</p>
        <div className="auth-mini-visual">
          <VisualOrgaos />
        </div>
      </section>

      <section className="auth-card">
        <div className="seg" role="tablist" aria-label="Entrar ou criar conta" style={{ marginBottom: 18 }}>
          <button type="button" role="tab" aria-selected={!cadastro} className={cadastro ? "" : "active"} onClick={() => trocarModo("entrar")}>
            Entrar
          </button>
          <button type="button" role="tab" aria-selected={cadastro} className={cadastro ? "active" : ""} onClick={() => trocarModo("cadastro")}>
            Criar conta
          </button>
        </div>
        <h2>{cadastro ? "Criar conta na PixoraMed" : "Acessar a PixoraMed"}</h2>
        <p>{cadastro ? "Cadastre-se para fazer análises e manter o seu histórico." : "Entre com o e-mail e a senha da sua conta."}</p>

        {avisoLogin && !cadastro && (
          <div style={{ marginBottom: 15 }}>
            <Alerta tipo="info" icone="info">
              {avisoLogin}
            </Alerta>
          </div>
        )}

        <form className="auth-form" onSubmit={enviar}>
          {cadastro && (
            <div className="field">
              <label htmlFor="cadastroNome">Nome</label>
              <div className="input-icon">
                <Icone nome="user" />
                <input
                  id="cadastroNome"
                  required
                  minLength={2}
                  maxLength={80}
                  autoComplete="name"
                  value={nome}
                  onChange={(evento) => setNome(evento.target.value)}
                />
              </div>
            </div>
          )}
          <div className="field">
            <label htmlFor="loginEmail">E-mail</label>
            <div className="input-icon">
              <Icone nome="user" />
              <input
                id="loginEmail"
                type="email"
                required
                maxLength={254}
                autoComplete="email"
                value={email}
                onChange={(evento) => setEmail(evento.target.value)}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="loginSenha">Senha</label>
            <div className="input-icon">
              <Icone nome="lock" />
              <input
                id="loginSenha"
                type="password"
                required
                minLength={cadastro ? 8 : undefined}
                maxLength={128}
                autoComplete={cadastro ? "new-password" : "current-password"}
                value={senha}
                onChange={(evento) => setSenha(evento.target.value)}
              />
            </div>
            {cadastro && <span className="hint">Pelo menos 8 caracteres.</span>}
          </div>
          {cadastro && (
            <div className="field">
              <label htmlFor="cadastroConfirmacao">Confirmar senha</label>
              <div className="input-icon">
                <Icone nome="lock" />
                <input
                  id="cadastroConfirmacao"
                  type="password"
                  required
                  maxLength={128}
                  autoComplete="new-password"
                  value={confirmacao}
                  onChange={(evento) => setConfirmacao(evento.target.value)}
                />
              </div>
            </div>
          )}
          <label className="checkline">
            <input type="checkbox" checked={manter} onChange={(evento) => setManter(evento.target.checked)} /> Manter conectado neste navegador
          </label>
          <div className="form-error" role="alert">
            {erro}
          </div>
          <button type="submit" className="btn primary" disabled={enviando}>
            {enviando ? "Aguarde..." : cadastro ? "Criar conta" : "Entrar"} <Icone nome="arrow" />
          </button>
        </form>
        <div className="auth-divider">OU</div>
        <button type="button" className="btn secondary" onClick={() => navegar("/")}>
          Voltar à página inicial
        </button>
        <p className="auth-foot">
          Projeto acadêmico: não use a mesma senha de outros serviços. A senha é guardada só como hash (scrypt) e a sessão vale por 8 horas.
        </p>
      </section>
    </main>
  );
}
