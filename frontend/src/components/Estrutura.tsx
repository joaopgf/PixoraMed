import type { ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import Icone from "./Icone";
import Marca from "./Marca";

const NAVEGACAO = [
  { para: "/painel", nome: "Visão geral", icone: "home", grupo: "WORKSPACE" },
  { para: "/nova", nome: "Nova análise", icone: "plusfile" },
  { para: "/historico", nome: "Histórico de análises", icone: "clock" },
  { para: "/resultados", nome: "Resultados dos treinos", icone: "chart", grupo: "PROJETO" },
  { para: "/modelos", nome: "Módulos e modelos", icone: "layers" },
  { para: "/limitacoes", nome: "Limitações e ética", icone: "warning" },
  { para: "/conta", nome: "Conta e segurança", icone: "shield", grupo: "CONTA" },
];

const TITULOS: [string, string][] = [
  ["/painel", "Visão geral"],
  ["/nova", "Nova análise"],
  ["/analise", "Preparar exame"],
  ["/revisao", "Revisar caso"],
  ["/resultado/", "Resultado da análise"],
  ["/historico", "Histórico de análises"],
  ["/resultados", "Resultados dos treinos"],
  ["/modelos", "Módulos e modelos"],
  ["/limitacoes", "Limitações e ética"],
  ["/conta", "Conta e segurança"],
];

export function Estrutura() {
  const { pathname } = useLocation();
  const navegar = useNavigate();
  const titulo = TITULOS.find(([caminho]) => pathname.startsWith(caminho))?.[1] ?? "";
  const emAnalise = ["/nova", "/analise", "/revisao", "/resultado/"].some((caminho) => pathname.startsWith(caminho));

  const itensMoveis = [
    { para: "/painel", nome: "Início", icone: "home", ativo: pathname === "/painel" },
    { para: "/nova", nome: "Nova análise", icone: "plusfile", ativo: emAnalise },
    { para: "/historico", nome: "Histórico", icone: "clock", ativo: pathname === "/historico" },
    { para: "/resultados", nome: "Resultados", icone: "chart", ativo: pathname === "/resultados" },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Marca para="/painel" />
        </div>
        <nav className="side-nav">
          {NAVEGACAO.map((item) => (
            <div key={item.para} style={{ display: "contents" }}>
              {item.grupo && <div className="side-label">{item.grupo}</div>}
              <NavLink to={item.para} className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
                <Icone nome={item.icone} />
                <span>{item.nome}</span>
              </NavLink>
            </div>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-demo">
          <strong>Projeto acadêmico</strong>
          <p>Os modelos são experimentais e não foram validados clinicamente. O resultado não é um diagnóstico.</p>
        </div>
        <div className="user-mini">
          <span className="avatar">PD</span>
          <div>
            <strong>Profissional demo</strong>
            <small>Perfil de apresentação</small>
          </div>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <div className="topbar-left">
            <Marca para="/painel" className="mobile-brand" />
            <span className="topbar-title">{titulo}</span>
          </div>
          <div className="topbar-right">
            <span className="pill demo">
              <span className="pulse" /> MODO DEMONSTRAÇÃO
            </span>
            <button type="button" className="topbar-action" aria-label="Conta e segurança" onClick={() => navegar("/conta")}>
              <Icone nome="user" />
            </button>
            <div className="topbar-user">
              <span className="avatar">PD</span>
              <div className="user-label">
                <strong>Profissional demo</strong>
                <small>Conta ilustrativa</small>
              </div>
            </div>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>

      <nav className="mobile-nav">
        {itensMoveis.map((item) => (
          <button key={item.para} type="button" className={item.ativo ? "active" : ""} onClick={() => navegar(item.para)}>
            <Icone nome={item.icone} />
            <span>{item.nome}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export function CabecalhoPagina({
  rotulo,
  titulo,
  descricao,
  acoes,
}: {
  rotulo: string;
  titulo: string;
  descricao: ReactNode;
  acoes?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        <div className="eyebrow">{rotulo}</div>
        <h1>{titulo}</h1>
        <p>{descricao}</p>
      </div>
      {acoes && <div className="head-actions">{acoes}</div>}
    </div>
  );
}

export function Alerta({ tipo, icone = "info", children }: { tipo?: "info"; icone?: string; children: ReactNode }) {
  return (
    <div className={`alert ${tipo ?? ""}`}>
      <Icone nome={icone} />
      <div>{children}</div>
    </div>
  );
}

export function Etapas({ atual }: { atual: 1 | 2 | 3 }) {
  const nomes = ["Exame", "Revisão", "Resultado"];
  return (
    <div className="steps-bar">
      {nomes.map((nome, i) => (
        <div key={nome} style={{ display: "contents" }}>
          {i > 0 && <div className="flow-connector" />}
          <div className={`flow-step${i + 1 <= atual ? " active" : ""}`}>
            <span>{i + 1 < atual ? "✓" : i + 1}</span> {nome}
          </div>
        </div>
      ))}
    </div>
  );
}

export function LinkTexto({ para, children }: { para: string; children: ReactNode }) {
  return (
    <Link className="text-link" to={para}>
      {children}
    </Link>
  );
}
