"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Download, Filter, Loader2, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { EmptyState, PageHeader, Segmented, Skeleton } from "@/components/ui/misc";
import { useAppData, useMoney } from "@/components/providers/app-data";
import { api } from "@/lib/api-client";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from "@/lib/constants";
import { addDays, financialMonth, toDateInput } from "@/lib/dates";
import type { TransactionFilters } from "@/lib/validation";
import { cn } from "@/lib/utils";
import { useQuickActions } from "./transaction-modal";
import { TransactionList } from "./transaction-row";
import type { TxView } from "./types";

interface ListResult {
  items: TxView[];
  total: number;
  page: number;
  hasMore: boolean;
  totals: { income: number; expense: number; transfer: number };
}

type TypeFilter = "ALL" | "INCOME" | "EXPENSE" | "TRANSFER";

export function TransactionsView({ initial, filters, queryFilters }: { initial: ListResult; filters: TransactionFilters; queryFilters: TransactionFilters }) {
  const router = useRouter();
  const pathname = usePathname();
  const { categories, accounts, user } = useAppData();
  const money = useMoney();
  const { openNew } = useQuickActions();
  const [pending, startTransition] = useTransition();
  const [items, setItems] = useState(initial.items);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState(filters.search ?? "");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    setItems(initial.items);
    setHasMore(initial.hasMore);
    setPage(1);
  }, [initial]);

  const apply = (patch: Partial<Record<keyof TransactionFilters, string | number | undefined>>) => {
    const next = new URLSearchParams();
    const merged = { ...filters, ...patch, page: undefined, pageSize: undefined } as Record<string, unknown>;
    for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== "" && v !== null) next.set(k, String(v));
    startTransition(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  };

  // Busca com debounce
  useEffect(() => {
    if ((filters.search ?? "") === search) return;
    const t = setTimeout(() => apply({ search: search || undefined }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const loadMore = async () => {
    setLoadingMore(true);
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(queryFilters)) if (v !== undefined && k !== "page") q.set(k, String(v));
    q.set("page", String(page + 1));
    try {
      const data = await api.get<ListResult>(`/transactions?${q}`);
      setItems((list) => [...list, ...data.items]);
      setPage(page + 1);
      setHasMore(data.hasMore);
    } finally {
      setLoadingMore(false);
    }
  };

  const month = financialMonth(new Date(), user.monthStartDay);
  const periods = [
    { label: "Este mês", from: toDateInput(month.start), to: toDateInput(addDays(month.end, -1)) },
    { label: "Últimos 30 dias", from: toDateInput(addDays(new Date(), -29)), to: toDateInput(new Date()) },
    { label: "Este ano", from: `${new Date().getFullYear()}-01-01`, to: `${new Date().getFullYear()}-12-31` },
  ];
  const activeFilters = [filters.categoryId, filters.accountId, filters.paymentMethod, filters.from, filters.minAmount, filters.maxAmount].filter((v) => v !== undefined).length;
  const typeValue: TypeFilter = filters.type ?? "ALL";

  return (
    <div>
      <PageHeader
        title="Transações"
        description="Tudo o que entrou e saiu, em um só lugar."
        action={
          <>
            <a href="/api/v1/export?format=csv" className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium hover:bg-subtle"><Download className="h-4 w-4" /> <span className="hidden sm:inline">Exportar CSV</span></a>
            <Button onClick={() => openNew()} className="hidden sm:inline-flex"><Plus className="h-4 w-4" /> Novo lançamento</Button>
          </>
        }
      />

      {/* Busca e filtros */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por descrição, categoria..." className="pl-10" aria-label="Buscar transações" />
          {search && <button onClick={() => setSearch("")} className="absolute top-1/2 right-3 -translate-y-1/2 rounded p-1 text-muted hover:text-foreground" aria-label="Limpar busca"><X className="h-4 w-4" /></button>}
        </div>
        <div className="flex gap-2">
          <Segmented
            className="flex-1 sm:flex-none"
            value={typeValue}
            onChange={(v) => apply({ type: v === "ALL" ? undefined : v })}
            options={[{ value: "ALL", label: "Todas" }, { value: "INCOME", label: "Receitas" }, { value: "EXPENSE", label: "Despesas" }, { value: "TRANSFER", label: "Transf." }]}
          />
          <Button variant={showFilters || activeFilters ? "secondary" : "outline"} onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters}>
            <Filter className="h-4 w-4" /> <span className="hidden sm:inline">Filtros</span>
            {activeFilters > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[10px] text-white">{activeFilters}</span>}
          </Button>
        </div>
      </div>

      {showFilters && (
        <Card className="mb-4 animate-slide-up p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Categoria">
              <Select value={filters.categoryId ?? ""} onChange={(e) => apply({ categoryId: e.target.value || undefined })}>
                <option value="">Todas</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name} ({c.type === "INCOME" ? "receita" : "despesa"})</option>)}
              </Select>
            </Field>
            <Field label="Conta">
              <Select value={filters.accountId ?? ""} onChange={(e) => apply({ accountId: e.target.value || undefined })}>
                <option value="">Todas</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </Select>
            </Field>
            <Field label="Forma de pagamento">
              <Select value={filters.paymentMethod ?? ""} onChange={(e) => apply({ paymentMethod: e.target.value || undefined })}>
                <option value="">Todas</option>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>)}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="De"><Input type="date" value={filters.from ?? ""} onChange={(e) => apply({ from: e.target.value || undefined })} /></Field>
              <Field label="Até"><Input type="date" value={filters.to ?? ""} onChange={(e) => apply({ to: e.target.value || undefined })} /></Field>
            </div>
            <Field label="Valor mínimo"><MoneyInput value={filters.minAmount ?? 0} onChange={(v) => apply({ minAmount: v || undefined })} currency={user.currency} /></Field>
            <Field label="Valor máximo"><MoneyInput value={filters.maxAmount ?? 0} onChange={(v) => apply({ maxAmount: v || undefined })} currency={user.currency} /></Field>
            <div className="flex flex-wrap items-end gap-2 sm:col-span-2">
              {periods.map((p) => (
                <button key={p.label} onClick={() => apply({ from: p.from, to: p.to })} className={cn("rounded-full px-3 py-2 text-xs font-medium", filters.from === p.from && filters.to === p.to ? "bg-foreground text-background" : "bg-subtle text-muted hover:text-foreground")}>
                  {p.label}
                </button>
              ))}
              {activeFilters > 0 && (
                <button onClick={() => startTransition(() => router.replace(pathname))} className="ml-auto text-xs font-medium text-danger hover:underline">Limpar filtros</button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Totais do filtro */}
      <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: "Receitas", value: initial.totals.income, cls: "text-income" },
          { label: "Despesas", value: initial.totals.expense, cls: "text-expense" },
          { label: "Resultado", value: initial.totals.income - initial.totals.expense, cls: initial.totals.income - initial.totals.expense >= 0 ? "text-foreground" : "text-expense" },
        ].map((t) => (
          <Card key={t.label} className="px-3 py-3 sm:px-4">
            <p className="text-[11px] font-medium text-muted sm:text-xs">{t.label}</p>
            <p className={cn("tabular mt-0.5 text-[13px] leading-tight font-semibold min-[400px]:text-sm sm:text-lg", t.cls)}>{money(t.value)}</p>
          </Card>
        ))}
      </div>

      <Card className={cn("p-2 transition-opacity sm:p-3", pending && "opacity-60")}>
        {pending && items.length === 0 ? (
          <div className="space-y-2 p-2">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={filters.search || activeFilters ? "🔍" : "🧾"}
            title={filters.search || activeFilters ? "Nenhuma transação encontrada" : "Nenhuma transação ainda"}
            description={filters.search || activeFilters ? "Tente ajustar a busca ou os filtros." : "Comece registrando uma receita ou despesa."}
            action={!filters.search && !activeFilters ? <Button onClick={() => openNew()}><Plus className="h-4 w-4" /> Adicionar lançamento</Button> : undefined}
          />
        ) : (
          <>
            <div className="flex items-center justify-between px-2 pt-1 pb-3">
              <p className="text-xs text-muted">{initial.total} {initial.total === 1 ? "transação" : "transações"}{!filters.future && !filters.from && !filters.to ? " até hoje" : ""}</p>
              {!filters.from && !filters.to && (
                <button onClick={() => apply({ future: filters.future ? undefined : "1" })} className="text-xs font-medium text-brand hover:underline">
                  {filters.future ? "Ocultar lançamentos futuros" : "Mostrar lançamentos futuros"}
                </button>
              )}
            </div>
            <TransactionList items={items} />
            {hasMore && (
              <div className="p-2 pt-4 text-center">
                <Button variant="secondary" onClick={loadMore} loading={loadingMore}>Carregar mais</Button>
              </div>
            )}
          </>
        )}
        {pending && items.length > 0 && <Loader2 className="mx-auto my-2 h-4 w-4 animate-spin text-muted" />}
      </Card>
    </div>
  );
}
