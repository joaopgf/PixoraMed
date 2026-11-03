import { NavLink, Route, Routes } from "react-router-dom";

import Analisar from "./pages/Analisar";
import Inicio from "./pages/Inicio";
import Limitacoes from "./pages/Limitacoes";
import Resultados from "./pages/Resultados";

const links = [
  { para: "/", nome: "Início" },
  { para: "/analisar", nome: "Analisar imagem" },
  { para: "/resultados", nome: "Resultados" },
  { para: "/limitacoes", nome: "Limitações e ética" },
];

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <NavLink to="/" className="flex items-center gap-2 text-lg font-semibold text-marca-900">
            <img src="/icone.svg" alt="" className="h-7 w-7" />
            PixoraMed
          </NavLink>
          <nav className="flex flex-wrap gap-1 text-sm">
            {links.map((link) => (
              <NavLink
                key={link.para}
                to={link.para}
                end={link.para === "/"}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 font-medium transition ${
                    isActive ? "bg-marca-50 text-marca-700" : "text-slate-600 hover:bg-slate-100"
                  }`
                }
              >
                {link.nome}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/analisar" element={<Analisar />} />
          <Route path="/resultados" element={<Resultados />} />
          <Route path="/limitacoes" element={<Limitacoes />} />
        </Routes>
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        PixoraMed · Projeto acadêmico do Bootcamp de IA (TCS / SENAI). Não é um dispositivo médico e não faz diagnóstico.
      </footer>
    </div>
  );
}
