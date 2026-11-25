"use client";

import { useEffect } from "react";

export function PrintActions() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 600);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="mb-6 flex gap-2 print:hidden">
      <button onClick={() => window.print()} className="rounded-xl bg-[#5b5cf0] px-4 py-2 text-sm font-medium text-white">Imprimir / Salvar como PDF</button>
      <button onClick={() => window.history.back()} className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700">Voltar</button>
    </div>
  );
}
