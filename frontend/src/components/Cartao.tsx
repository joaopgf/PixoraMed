import type { ReactNode } from "react";

export function Cartao({ titulo, children, className = "" }: { titulo?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      {titulo && <h2 className="mb-4 text-base font-semibold text-slate-900">{titulo}</h2>}
      {children}
    </section>
  );
}

export function Aviso({ tipo = "info", children }: { tipo?: "info" | "alerta"; children: ReactNode }) {
  const cores =
    tipo === "alerta" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-marca-100 bg-marca-50 text-marca-900";
  return <div className={`rounded-lg border px-4 py-3 text-sm ${cores}`}>{children}</div>;
}

export function Carregando({ texto = "Carregando..." }: { texto?: string }) {
  return <p className="text-sm text-slate-500">{texto}</p>;
}
