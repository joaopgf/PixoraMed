// Estrutura das telas internas: menu lateral, barra do topo, menu inferior no celular e a página atual.
import { Suspense } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import Brand from "./Brand";
import Icon from "./Icon";
import { initials } from "../utils/modules";

const NAVIGATION = [
  { to: "/dashboard", name: "Visão geral", icon: "home", group: "WORKSPACE" },
  { to: "/new-analysis", name: "Nova análise", icon: "plusfile" },
  { to: "/history", name: "Histórico de análises", icon: "clock" },
  { to: "/models", name: "Módulos e modelos", icon: "layers", group: "PROJETO" },
  { to: "/limitations", name: "Limitações e ética", icon: "warning" },
  { to: "/account", name: "Conta e segurança", icon: "shield", group: "CONTA" },
];

const TITLES = [
  ["/dashboard", "Visão geral"],
  ["/new-analysis", "Nova análise"],
  ["/analysis", "Preparar exame"],
  ["/review", "Revisar caso"],
  ["/result/", "Resultado da análise"],
  ["/history", "Histórico de análises"],
  ["/models", "Módulos e modelos"],
  ["/limitations", "Limitações e ética"],
  ["/account", "Conta e segurança"],
];

const ANALYSIS_PATHS = ["/new-analysis", "/analysis", "/review", "/result/"];

export default function Layout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const name = user?.name ?? "";
  const email = user?.email ?? "";
  const title = TITLES.find(([path]) => pathname.startsWith(path))?.[1] ?? "";
  const inAnalysis = ANALYSIS_PATHS.some((path) => pathname.startsWith(path));

  const mobileItems = [
    {
      to: "/dashboard",
      name: "Início",
      icon: "home",
      active: pathname === "/dashboard",
    },
    {
      to: "/new-analysis",
      name: "Nova análise",
      icon: "plusfile",
      active: inAnalysis,
    },
    {
      to: "/history",
      name: "Histórico",
      icon: "clock",
      active: pathname === "/history",
    },
    {
      to: "/limitations",
      name: "Limitações",
      icon: "warning",
      active: pathname === "/limitations",
    },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Brand to="/dashboard" />
        </div>
        <nav className="side-nav">
          {NAVIGATION.map((item) => (
            <div key={item.to} style={{ display: "contents" }}>
              {item.group && <div className="side-label">{item.group}</div>}
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `nav-item${isActive ? " active" : ""}`
                }
              >
                <Icon name={item.icon} />
                <span>{item.name}</span>
              </NavLink>
            </div>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-demo">
          <strong>Projeto acadêmico</strong>
          <p>
            Os modelos são experimentais e não foram validados clinicamente. O
            resultado não é um diagnóstico.
          </p>
        </div>
        <div className="user-mini">
          <span className="avatar">{initials(name)}</span>
          <div>
            <strong>{name}</strong>
            <small>{email}</small>
          </div>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <div className="topbar-left">
            <Brand to="/dashboard" className="mobile-brand" />
            <span className="topbar-title">{title}</span>
          </div>
          <div className="topbar-right">
            <span className="pill demo">
              <span className="pulse" /> PROJETO ACADÊMICO
            </span>
            <button
              type="button"
              className="topbar-action"
              aria-label="Conta e segurança"
              onClick={() => navigate("/account")}
            >
              <Icon name="user" />
            </button>
            <div className="topbar-user">
              <span className="avatar">{initials(name)}</span>
              <div className="user-label">
                <strong>{name}</strong>
                <small>{email}</small>
              </div>
            </div>
          </div>
        </header>
        <main className="content">
          {/* As telas internas são carregadas sob demanda (App.jsx); o menu continua na tela enquanto isso */}
          <Suspense fallback={<div className="empty">Carregando...</div>}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <nav className="mobile-nav">
        {mobileItems.map((item) => (
          <button
            key={item.to}
            type="button"
            className={item.active ? "active" : ""}
            onClick={() => navigate(item.to)}
          >
            <Icon name={item.icon} />
            <span>{item.name}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
