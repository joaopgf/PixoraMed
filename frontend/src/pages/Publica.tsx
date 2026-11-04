import { useNavigate } from "react-router-dom";

import { Alerta } from "../components/Estrutura";
import Icone from "../components/Icone";
import Marca from "../components/Marca";
import VisualOrgaos from "../components/VisualOrgaos";
import { useEstado } from "../estado";
import { MODULOS } from "../modulos";

const PASSOS = [
  { titulo: "Escolha o exame", texto: "Acesse o módulo correspondente ao tipo de imagem." },
  { titulo: "Envie a imagem", texto: "Confira o arquivo antes de executar a análise. A imagem é processada e descartada." },
  { titulo: "Revise a saída", texto: "Veja a classe prevista, as probabilidades e as limitações do modelo." },
];

export default function Publica() {
  const navegar = useNavigate();
  const { logado, setModuloPendente } = useEstado();

  const acessar = () => navegar(logado ? "/painel" : "/login");

  function abrirModulo(id: string) {
    if (logado) return navegar(`/analise/${id}`);
    setModuloPendente(id);
    navegar("/login");
  }

  return (
    <div className="public-shell">
      <header className="public-header">
        <Marca />
        <nav className="public-nav">
          <a href="#inicio">Início</a>
          <a href="#public-modules">Módulos</a>
          <a href="#how">Como funciona</a>
          <a href="#public-about">Sobre</a>
        </nav>
        <button type="button" className="btn primary" onClick={acessar}>
          Acessar plataforma <Icone nome="arrow" />
        </button>
      </header>

      <main>
        <section className="public-hero" id="inicio">
          <div className="public-copy">
            <div className="eyebrow">INTELIGÊNCIA ARTIFICIAL</div>
            <h1>
              Análise inteligente
              <br />
              de <span>imagens médicas.</span>
            </h1>
            <p>
              Redes neurais convolucionais para classificar imagens médicas de câncer, com módulos especializados por tipo de
              exame e uma análise honesta do que os números significam.
            </p>
            <div className="public-cta">
              <button type="button" className="btn primary" onClick={acessar}>
                Acessar ambiente demonstrativo <Icone nome="arrow" />
              </button>
              <a className="btn secondary" href="#public-modules">
                Conhecer os módulos
              </a>
            </div>
            <div className="public-meta">VISÃO COMPUTACIONAL · PYTORCH · PESQUISA APLICADA</div>
          </div>
          <div className="public-visual-wrap">
            <VisualOrgaos controles />
            <p className="visual-note">Representações anatômicas ilustrativas; não representam uma análise clínica.</p>
          </div>
        </section>

        <section className="public-modules" id="public-modules">
          <div className="section-head">
            <div>
              <div className="eyebrow">ÁREAS DE ANÁLISE</div>
              <h2>O que deseja analisar?</h2>
              <p>Selecione um módulo para conhecer o fluxo de envio do exame.</p>
            </div>
            <div className="module-count">
              <strong>{String(MODULOS.length).padStart(2, "0")}</strong>
              <span>
                módulos no
                <br />
                catálogo
              </span>
            </div>
          </div>
          <div className="module-grid">
            {MODULOS.map((modulo) => (
              <button key={modulo.id} type="button" className="module-card" onClick={() => abrirModulo(modulo.id)}>
                <span className="module-icon">
                  <Icone nome={modulo.icone} />
                </span>
                <span className="module-text">
                  <strong>{modulo.nome}</strong>
                  <small>{modulo.exame}</small>
                </span>
                <span className="card-arrow">↗</span>
              </button>
            ))}
          </div>
          <p className="catalog-note">
            <Icone nome="info" /> Cada módulo usa um modelo treinado só para aquele tipo de imagem. Modelos experimentais, sem
            validação clínica.
          </p>
        </section>

        <section className="public-steps" id="how">
          {PASSOS.map((passo, i) => (
            <div key={passo.titulo} className="step-card">
              <span className="step-num">0{i + 1}</span>
              <div>
                <strong>{passo.titulo}</strong>
                <p>{passo.texto}</p>
              </div>
            </div>
          ))}
        </section>

        <section id="public-about">
          <Alerta tipo="info" icone="shield">
            <strong>Projeto acadêmico de pesquisa aplicada (Bootcamp de IA TCS / SENAI).</strong>
            <br />
            Esta interface não faz diagnóstico, não substitui a avaliação de um profissional e não deve receber dados reais de
            pacientes.
          </Alerta>
        </section>
      </main>

      <footer className="public-footer" style={{ marginTop: 24 }}>
        <Marca />
        <span className="footer-copy">Visão computacional aplicada à saúde</span>
        <span className="tiny muted">Versão demonstrativa 0.2</span>
      </footer>
    </div>
  );
}
