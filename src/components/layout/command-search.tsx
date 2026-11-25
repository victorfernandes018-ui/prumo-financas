"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Loader2, Search } from "lucide-react";
import { TransactionRow } from "@/components/features/transactions/transaction-row";
import type { TxView } from "@/components/features/transactions/types";
import { api } from "@/lib/api-client";
import { NAV_INSIGHTS, NAV_MAIN, NAV_MONEY } from "./nav-items";
import { normalize } from "@/lib/utils";

const PAGES = [...NAV_MAIN, ...NAV_MONEY, ...NAV_INSIGHTS, { href: "/profile", label: "Perfil", icon: Search }];
const EXAMPLES = ["mercado", "Uber", "salário", "Netflix"];

/** Busca global (⌘K): transações + atalhos para páginas. */
export function CommandSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<TxView[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setResults([]);
    requestAnimationFrame(() => inputRef.current?.focus());
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || q.trim().length < 2) {
      setResults([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const data = await api.get<{ items: TxView[]; total: number }>(`/transactions?search=${encodeURIComponent(q.trim())}&pageSize=8`);
        setResults(data.items);
        setTotal(data.total);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [q, open]);

  if (!open || typeof document === "undefined") return null;
  const pages = q.trim() ? PAGES.filter((p) => normalize(p.label).includes(normalize(q.trim()))) : [];

  const goAll = () => {
    router.push(`/transactions?search=${encodeURIComponent(q.trim())}`);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-3 pt-[8vh] sm:p-6 sm:pt-[12vh]" role="dialog" aria-modal="true" aria-label="Buscar">
      <div className="absolute inset-0 animate-fade-in bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-xl animate-scale-in overflow-hidden rounded-2xl border border-border bg-card shadow-pop">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) goAll();
          }}
          className="flex items-center gap-3 border-b border-border px-4"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted" /> : <Search className="h-5 w-5 text-muted" />}
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar transações, categorias, páginas..."
            className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted"
          />
          <kbd className="hidden rounded-md border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted sm:block">ESC</kbd>
        </form>
        <div className="max-h-[60vh] overflow-y-auto p-2" onClickCapture={(e) => (e.target as HTMLElement).closest("button[type=button]") && setTimeout(onClose, 0)}>
          {!q.trim() && (
            <div className="p-3">
              <p className="mb-2 text-xs font-medium text-muted">Experimente buscar</p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLES.map((ex) => (
                  <span key={ex} role="button" tabIndex={0} onClick={() => setQ(ex)} onKeyDown={(e) => e.key === "Enter" && setQ(ex)} className="cursor-pointer rounded-full bg-subtle px-3 py-1.5 text-xs font-medium hover:bg-border">
                    {ex}
                  </span>
                ))}
              </div>
            </div>
          )}
          {pages.length > 0 && (
            <div className="mb-1">
              <p className="px-2 py-1.5 text-xs font-medium text-muted">Páginas</p>
              {pages.map((p) => (
                <div key={p.href} role="link" tabIndex={0} onClick={() => { router.push(p.href); onClose(); }} onKeyDown={(e) => e.key === "Enter" && (router.push(p.href), onClose())} className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2.5 text-sm hover:bg-subtle">
                  <p.icon className="h-4 w-4 text-muted" /> {p.label}
                </div>
              ))}
            </div>
          )}
          {results.length > 0 && (
            <div>
              <p className="px-2 py-1.5 text-xs font-medium text-muted">Transações</p>
              {results.map((tx) => <TransactionRow key={tx.id} tx={tx} showDate />)}
              {total > results.length && (
                <div role="button" tabIndex={0} onClick={goAll} className="mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-brand hover:bg-brand-soft">
                  Ver todos os {total} resultados <CornerDownLeft className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          )}
          {q.trim().length >= 2 && !loading && !results.length && !pages.length && (
            <p className="px-3 py-10 text-center text-sm text-muted">Nada encontrado para “{q}”.</p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
