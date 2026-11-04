import { useEffect } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";

import { Estrutura } from "./components/Estrutura";
import { useEstado } from "./estado";
import Catalogo from "./pages/Catalogo";
import Conta from "./pages/Conta";
import Historico from "./pages/Historico";
import Limitacoes from "./pages/Limitacoes";
import Login from "./pages/Login";
import Modelos from "./pages/Modelos";
import Painel from "./pages/Painel";
import Preparar from "./pages/Preparar";
import Publica from "./pages/Publica";
import Resultado from "./pages/Resultado";
import Resultados from "./pages/Resultados";
import Revisao from "./pages/Revisao";

function ExigeAcesso() {
  const { logado } = useEstado();
  return logado ? <Outlet /> : <Navigate to="/login" replace />;
}

function VoltarAoTopo() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <VoltarAoTopo />
      <Routes>
        <Route path="/" element={<Publica />} />
        <Route path="/login" element={<Login />} />
        <Route element={<ExigeAcesso />}>
          <Route element={<Estrutura />}>
            <Route path="/painel" element={<Painel />} />
            <Route path="/nova" element={<Catalogo />} />
            <Route path="/analise/:moduloId" element={<Preparar />} />
            <Route path="/revisao" element={<Revisao />} />
            <Route path="/resultado/:id" element={<Resultado />} />
            <Route path="/historico" element={<Historico />} />
            <Route path="/resultados" element={<Resultados />} />
            <Route path="/modelos" element={<Modelos />} />
            <Route path="/limitacoes" element={<Limitacoes />} />
            <Route path="/conta" element={<Conta />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
