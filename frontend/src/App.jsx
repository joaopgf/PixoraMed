// Rotas do site: páginas públicas (início e login) e as telas internas, que exigem login.
import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import ProtectedRoute from "./auth/ProtectedRoute";
import Layout from "./components/Layout";
import Account from "./pages/Account";
import Dashboard from "./pages/Dashboard";
import History from "./pages/History";
import Landing from "./pages/Landing";
import Limitations from "./pages/Limitations";
import Login from "./pages/Login";
import Models from "./pages/Models";
import NewAnalysis from "./pages/NewAnalysis";
import PrepareExam from "./pages/PrepareExam";
import Result from "./pages/Result";
import Review from "./pages/Review";
import TrainingResults from "./pages/TrainingResults";

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
            <Route path="/training-results" element={<TrainingResults />} />
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
