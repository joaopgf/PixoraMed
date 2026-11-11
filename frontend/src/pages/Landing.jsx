// Página inicial pública: apresentação, módulos, como funciona, créditos dos datasets e aviso acadêmico.
import { useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import Brand from "../components/Brand";
import { Alert } from "../components/common";
import DatasetCredits from "../components/DatasetCredits";
import Icon from "../components/Icon";
import OrganVisual from "../components/OrganVisual";
import { useAnalysis } from "../context/AnalysisContext";
import { MODULES } from "../utils/modules";

const STEPS = [
  {
    title: "Escolha o exame",
    text: "Acesse o módulo correspondente ao tipo de imagem.",
  },
  {
    title: "Envie a imagem",
    text: "Confira o arquivo antes de executar a análise. A imagem é processada e descartada.",
  },
  {
    title: "Revise a saída",
    text: "Veja a classe prevista, as probabilidades e as limitações do modelo.",
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const { setPendingModule } = useAnalysis();

  const enter = () => navigate(isLoggedIn ? "/dashboard" : "/login");

  // Sem login, guarda o módulo escolhido e abre depois de entrar
  function openModule(id) {
    if (isLoggedIn) return navigate(`/analysis/${id}`);
    setPendingModule(id);
    navigate("/login");
  }

  return (
    <div className="public-shell">
      <header className="public-header">
        <Brand />
        <nav className="public-nav">
          <a href="#home">Início</a>
          <a href="#public-modules">Módulos</a>
          <a href="#how">Como funciona</a>
          <a href="#public-data">Dados</a>
          <a href="#public-about">Sobre</a>
        </nav>
        <button type="button" className="btn primary" onClick={enter}>
          Acessar plataforma <Icon name="arrow" />
        </button>
      </header>

      <main>
        <section className="public-hero" id="home">
          <div className="public-copy">
            <div className="eyebrow">INTELIGÊNCIA ARTIFICIAL</div>
            <h1>
              Análise inteligente
              <br />
              de <span>imagens médicas.</span>
            </h1>
            <p>
              Redes neurais convolucionais para classificar imagens médicas de
              câncer, com módulos especializados por tipo de exame e uma análise
              honesta do que os números significam.
            </p>
            <div className="public-cta">
              <button type="button" className="btn primary" onClick={enter}>
                Entrar ou criar conta <Icon name="arrow" />
              </button>
              <a className="btn secondary" href="#public-modules">
                Conhecer os módulos
              </a>
            </div>
            <div className="public-meta">
              VISÃO COMPUTACIONAL · PYTORCH · PESQUISA APLICADA
            </div>
          </div>
          <div className="public-visual-wrap">
            <OrganVisual controls />
            <p className="visual-note">
              Representações anatômicas ilustrativas; não representam uma
              análise clínica.
            </p>
          </div>
        </section>

        <section className="public-modules" id="public-modules">
          <div className="section-head">
            <div>
              <div className="eyebrow">ÁREAS DE ANÁLISE</div>
              <h2>O que deseja analisar?</h2>
              <p>
                Selecione um módulo para conhecer o fluxo de envio do exame.
              </p>
            </div>
            <div className="module-count">
              <strong>{String(MODULES.length).padStart(2, "0")}</strong>
              <span>
                módulos no
                <br />
                catálogo
              </span>
            </div>
          </div>
          <div className="module-grid">
            {MODULES.map((module) => (
              <button
                key={module.id}
                type="button"
                className="module-card"
                onClick={() => openModule(module.id)}
              >
                <span className="module-icon">
                  <Icon name={module.icon} />
                </span>
                <span className="module-text">
                  <strong>{module.name}</strong>
                  <small>{module.exam}</small>
                </span>
                <span className="card-arrow">↗</span>
              </button>
            ))}
          </div>
          <p className="catalog-note">
            <Icon name="info" /> Cada módulo usa um modelo treinado só para
            aquele tipo de imagem. Modelos experimentais, sem validação clínica.
          </p>
        </section>

        <section className="public-steps" id="how">
          {STEPS.map((step, i) => (
            <div key={step.title} className="step-card">
              <span className="step-num">0{i + 1}</span>
              <div>
                <strong>{step.title}</strong>
                <p>{step.text}</p>
              </div>
            </div>
          ))}
        </section>

        <section
          className="public-modules"
          id="public-data"
          style={{ marginBottom: 20 }}
        >
          <div className="section-head">
            <div>
              <div className="eyebrow">DADOS E CRÉDITOS</div>
              <h2>Datasets usados</h2>
              <p>Os modelos foram treinados com datasets públicos do Kaggle.</p>
            </div>
          </div>
          <DatasetCredits />
        </section>

        <section id="public-about">
          <Alert type="info" icon="shield">
            <strong>
              Projeto acadêmico de pesquisa aplicada (Bootcamp de IA TCS /
              SENAI).
            </strong>
            <br />
            Esta interface não faz diagnóstico, não substitui a avaliação de um
            profissional e não deve receber dados reais de pacientes.
          </Alert>
        </section>
      </main>

      <footer className="public-footer" style={{ marginTop: 24 }}>
        <Brand />
        <span className="footer-copy">
          Visão computacional aplicada à saúde
        </span>
        <span className="tiny muted">Versão demonstrativa 0.2</span>
      </footer>
    </div>
  );
}
