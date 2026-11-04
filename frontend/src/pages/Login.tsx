import { useNavigate } from "react-router-dom";

import { Alerta } from "../components/Estrutura";
import Icone from "../components/Icone";
import Marca from "../components/Marca";
import VisualOrgaos from "../components/VisualOrgaos";
import { useEstado } from "../estado";

export default function Login() {
  const navegar = useNavigate();
  const { entrar, moduloPendente, setModuloPendente } = useEstado();

  function entrarNaDemo() {
    entrar();
    if (moduloPendente) {
      setModuloPendente(null);
      navegar(`/analise/${moduloPendente}`);
    } else {
      navegar("/painel");
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-story">
        <Marca />
        <div style={{ marginTop: 42 }} className="eyebrow">
          AMBIENTE DE DEMONSTRAÇÃO
        </div>
        <h1>Uma experiência integrada para análise de imagens.</h1>
        <p>Selecione o módulo, carregue uma imagem, revise os dados e veja a resposta do modelo treinado pelo grupo.</p>
        <div className="auth-mini-visual">
          <VisualOrgaos />
        </div>
      </section>

      <section className="auth-card">
        <div className="pill demo">
          <Icone nome="info" /> ACESSO SIMULADO
        </div>
        <h2 style={{ marginTop: 17 }}>Acessar a PixoraMed</h2>
        <p>Entre no ambiente demonstrativo para conhecer os fluxos da plataforma.</p>
        <form
          className="auth-form"
          onSubmit={(evento) => {
            evento.preventDefault();
            entrarNaDemo();
          }}
        >
          <div className="field">
            <label htmlFor="loginEmail">E-mail profissional</label>
            <div className="input-icon">
              <Icone nome="user" />
              <input id="loginEmail" type="email" placeholder="Não é necessário no modo demonstração" autoComplete="off" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="loginPassword">Senha</label>
            <div className="input-icon">
              <Icone nome="lock" />
              <input id="loginPassword" type="password" placeholder="Não é necessária no modo demonstração" autoComplete="off" />
            </div>
          </div>
          <div className="auth-options">
            <label className="checkline">
              <input type="checkbox" checked disabled readOnly /> Manter sessão nesta demonstração
            </label>
            <span>Ambiente local</span>
          </div>
          <button type="submit" className="btn primary">
            Entrar na demonstração <Icone nome="arrow" />
          </button>
        </form>
        <div className="auth-divider">OU</div>
        <button type="button" className="btn secondary" onClick={() => navegar("/")}>
          Voltar à página inicial
        </button>
        <div style={{ marginTop: 18 }}>
          <Alerta tipo="info" icone="shield">
            <strong>Sem autenticação real.</strong>
            <br />
            Este acesso não verifica credenciais e não cria uma conta. Não digite uma senha de verdade.
          </Alerta>
        </div>
        <p className="auth-foot">A autenticação real exigirá gestão de identidade, controle de acesso e políticas de segurança.</p>
      </section>
    </main>
  );
}
