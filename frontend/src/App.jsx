// Rotas do site: páginas públicas (início e login) e as telas internas, que exigem login.
import { lazy, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import ProtectedRoute from "./auth/ProtectedRoute";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";

// Telas internas carregadas só quando abertas: a primeira visita baixa menos JavaScript
const Account = lazy(() => import("./pages/Account"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const History = lazy(() => import("./pages/History"));
const Limitations = lazy(() => import("./pages/Limitations"));
const Models = lazy(() => import("./pages/Models"));
const NewAnalysis = lazy(() => import("./pages/NewAnalysis"));
const PrepareExam = lazy(() => import("./pages/PrepareExam"));
const Result = lazy(() => import("./pages/Result"));
const Review = lazy(() => import("./pages/Review"));

// Volta ao topo a cada troca de página
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/new-analysis" element={<NewAnalysis />} />
            <Route path="/analysis/:moduleId" element={<PrepareExam />} />
            <Route path="/review" element={<Review />} />
            <Route path="/result/:id" element={<Result />} />
            <Route path="/history" element={<History />} />
            <Route path="/models" element={<Models />} />
            <Route path="/limitations" element={<Limitations />} />
            <Route path="/account" element={<Account />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
