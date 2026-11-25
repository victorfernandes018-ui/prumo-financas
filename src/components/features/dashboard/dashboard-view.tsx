"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowDownLeft, ArrowUpRight, CalendarClock, ChevronRight, CreditCard, HeartPulse, Landmark, PiggyBank, Plus, Sparkles, Wallet, X,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState, IconBubble, Progress, Segmented, Trend } from "@/components/ui/misc";
import { ChartLegend, DonutChart, FlowChart, foldSlices, type FlowPoint } from "@/components/charts/charts";
import { useAppData, useMoney } from "@/components/providers/app-data";
import { useQuickActions } from "@/components/features/transactions/transaction-modal";
import { TransactionRow } from "@/components/features/transactions/transaction-row";
import type { TxView } from "@/components/features/transactions/types";
import { formatDateShort, greeting, MONTHS_PT } from "@/lib/dates";
import { cn, firstName } from "@/lib/utils";

interface DashboardProps {
  data: {
    range: { start: string; end: string };
    balance: number;
    balanceChange: number | null;
    income: number;
    incomeChange: number | null;
    expense: number;
    expenseChange: number | null;
    available: number;
    availableChange: number | null;
    daysLeft: number;
    series: { week: FlowPoint[]; month: FlowPoint[]; year: FlowPoint[] };
    categories: { categoryId: string; name: string; icon: string; color: string; amount: number; percent: number; count: number }[];
    monthExpenses: { id: string; description: string; amount: number; date: string; categoryId: string | null; installmentNumber: number | null; installmentTotal: number | null }[];
    recent: TxView[];
    accounts: { id: string; name: string; balance: number; color: string; type: string }[];
  };
  budgets: { id: string; category: { name: string; icon: string; color: string }; amount: number; spent: number; percent: number; status: "ok" | "warning" | "exceeded" }[];
  goals: { id: string; name: string; icon: string; color: string; targetAmount: number; currentAmount: number }[];
  bills: { id: string; name: string; amount: number; daysUntilDue: number; nextDue: string; overdue: boolean; category: { icon: string; color: string } | null }[];
  pendingBillsTotal: number;
  cards: { id: string; name: string; color: string; limit: number; available: number; utilization: number; invoice: number; due: string }[];
  health: { score: number; label: string; emoji: string; message: string; hasData: boolean };
}

type Period = "week" | "month" | "year";

function StatCard({
  label, value, change, inverse, icon, tone, hero, className,
}: {
  label: string; value: string; change: number | null; inverse?: boolean; icon: React.ReactNode; tone: "brand" | "income" | "expense" | "neutral"; hero?: boolean; className?: string;
}) {
  const toneBg = { brand: "bg-brand-soft text-brand", income: "bg-income-soft text-income", expense: "bg-expense-soft text-expense", neutral: "bg-subtle text-foreground" }[tone];
  if (hero) {
    return (
      <div className="relative col-span-2 overflow-hidden rounded-2xl sm:col-span-3 bg-gradient-to-br from-[#5b5cf0] via-[#5b4fe0] to-[#4338ca] p-5 text-white shadow-lg shadow-brand/20 lg:col-span-1">
        <div className="pointer-events-none absolute -top-10 -right-10 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-medium text-white/75">{label}</p>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">{icon}</span>
        </div>
        <p className="tabular mt-3 text-[28px] leading-none font-semibold tracking-tight">{value}</p>
        <div className="mt-3 text-xs">
          {change === null ? (
            <span className="text-white/70">Primeiro mês de acompanhamento</span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 font-semibold">
              {change >= 0 ? "+" : ""}{change.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% <span className="font-normal text-white/75">em relação ao mês passado</span>
            </span>
          )}
        </div>
      </div>
    );
  }
  return (
    <Card className={cn("p-4 sm:p-5", className)}>
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-muted">{label}</p>
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", toneBg)}>{icon}</span>
      </div>
      <p className="tabular mt-2.5 text-xl font-semibold tracking-tight sm:text-2xl">{value}</p>
      <Trend value={change} inverse={inverse} className="mt-2 hidden sm:inline-flex" suffix="vs. mês passado" />
      <Trend value={change} inverse={inverse} className="mt-2 sm:hidden" suffix="" />
    </Card>
  );
}

export function DashboardView({ data, budgets, goals, bills, pendingBillsTotal, cards, health }: DashboardProps) {
  const { user } = useAppData();
  const money = useMoney();
  const { openNew } = useQuickActions();
  const [period, setPeriod] = useState<Period>("month");
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  const monthName = MONTHS_PT[new Date().getMonth()];
  const isEmpty = data.recent.length === 0 && data.income === 0 && data.expense === 0;
  const free = data.available - pendingBillsTotal;
  const perDay = Math.max(0, Math.floor(free / data.daysLeft));

  const slices = useMemo(
    () => foldSlices(data.categories.map((c) => ({ id: c.categoryId, name: c.name, icon: c.icon, color: c.color, amount: c.amount, percent: c.percent }))),
    [data.categories],
  );
  const drill = selectedCat ? data.monthExpenses.filter((t) => (selectedCat === "none" ? !t.categoryId : t.categoryId === selectedCat)) : [];
  const selectedInfo = data.categories.find((c) => c.categoryId === selectedCat);

  return (
    <div className="space-y-6">
      {/* Saudação */}
      <div className="flex flex-wrap items-end justify-between gap-3 animate-slide-up">
        <div>
          <p className="text-sm text-muted">{greeting()},</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">Olá, {firstName(user.name)} 👋</h1>
          <p className="mt-1 text-sm text-muted">Veja como está sua vida financeira em {monthName}.</p>
        </div>
        <Link href="/health" className="hidden items-center gap-3 rounded-2xl border border-border bg-card px-4 py-2.5 transition-colors hover:bg-card-hover sm:flex">
          <HeartPulse className="h-5 w-5 text-brand" />
          <div>
            <p className="text-[11px] text-muted">Organização financeira</p>
            <p className="tabular text-sm font-semibold">{health.hasData ? `${health.score}/100 · ${health.label}` : "Sem dados ainda"}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted" />
        </Link>
      </div>

      {isEmpty ? (
        <Card>
          <EmptyState
            icon="🌱"
            title="Seu painel está pronto para começar"
            description="Adicione suas primeiras receitas e despesas. Em poucos lançamentos você já vai entender para onde seu dinheiro está indo."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="income" onClick={() => openNew("INCOME")}><ArrowDownLeft className="h-4 w-4" /> Adicionar receita</Button>
                <Button variant="expense" onClick={() => openNew("EXPENSE")}><ArrowUpRight className="h-4 w-4" /> Adicionar despesa</Button>
              </div>
            }
          />
        </Card>
      ) : null}

      {/* Indicadores principais */}
      <div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
        <StatCard hero label="Saldo atual" value={money(data.balance)} change={data.balanceChange} icon={<Wallet className="h-[18px] w-[18px]" />} tone="brand" />
        <StatCard label="Receitas" value={money(data.income)} change={data.incomeChange} icon={<ArrowDownLeft className="h-4 w-4" />} tone="income" />
        <StatCard label="Despesas" value={money(data.expense)} change={data.expenseChange} inverse icon={<ArrowUpRight className="h-4 w-4" />} tone="expense" />
        <StatCard className="col-span-2 sm:col-span-1" label="Valor disponível" value={money(data.available)} change={data.availableChange} icon={<PiggyBank className="h-4 w-4" />} tone="neutral" />
      </div>

      {/* Quanto posso gastar */}
      {!isEmpty && (
        <div className="flex animate-slide-up flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-income-soft text-lg">💡</div>
            <div>
              <p className="text-sm font-medium">
                {free > 0 ? (
                  <>Você pode gastar <b className="tabular text-income">{money(perDay)}/dia</b> até o fim do mês</>
                ) : (
                  <>Seu orçamento do mês está no limite — segure os gastos não essenciais</>
                )}
              </p>
              <p className="text-xs text-muted">
                {money(Math.max(free, 0))} livres em {data.daysLeft} dias, já descontando {money(pendingBillsTotal)} em contas a vencer.
              </p>
            </div>
          </div>
          <Link href="/assistant" className="flex items-center gap-1.5 text-[13px] font-medium text-brand hover:underline sm:ml-auto">
            <Sparkles className="h-4 w-4" /> Perguntar ao assistente
          </Link>
        </div>
      )}

      {/* Atalhos (celular) */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:hidden">
        {[
          { href: "/accounts", label: "Contas", icon: Landmark },
          { href: "/cards", label: "Cartões", icon: CreditCard },
          { href: "/recurring", label: "Contas fixas", icon: CalendarClock },
          { href: "/budget", label: "Orçamento", icon: PiggyBank },
          { href: "/health", label: "Saúde", icon: HeartPulse },
          { href: "/assistant", label: "Assistente", icon: Sparkles },
        ].map((s) => (
          <Link key={s.href} href={s.href} className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-[13px] font-medium">
            <s.icon className="h-4 w-4 text-brand" /> {s.label}
          </Link>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader
            title="Evolução financeira"
            description={period === "year" ? "Últimos 12 meses" : period === "month" ? "Acumulado no mês" : "Últimos 7 dias"}
            action={<Segmented size="sm" value={period} onChange={setPeriod} options={[{ value: "week", label: "Semana" }, { value: "month", label: "Mês" }, { value: "year", label: "Ano" }]} />}
          />
          <div className="px-3 pt-3 pb-4 sm:px-5">
            <ChartLegend keys={["income", "expense", "balance"]} className="mb-3 px-2 sm:px-0" />
            <FlowChart data={data.series[period]} mode={period === "year" ? "bars" : "cumulative"} currency={user.currency} />
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Gastos por categoria" description="Toque em uma categoria para ver os gastos" />
          {data.categories.length === 0 ? (
            <EmptyState icon="🍩" title="Nenhum gasto este mês" description="Seus gastos por categoria aparecerão aqui." />
          ) : (
            <div className="p-5">
              <DonutChart data={slices} total={data.expense} currency={user.currency} selected={selectedCat} onSelect={setSelectedCat} size={190} centerLabel="Total gasto" />
              {selectedCat && selectedInfo ? (
                <div className="mt-4 animate-fade-in">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold">{selectedInfo.icon} {selectedInfo.name} · {drill.length} {drill.length === 1 ? "gasto" : "gastos"}</p>
                    <button onClick={() => setSelectedCat(null)} className="rounded-md p-1 text-muted hover:bg-subtle" aria-label="Limpar seleção"><X className="h-4 w-4" /></button>
                  </div>
                  <ul className="max-h-48 space-y-1 overflow-y-auto">
                    {drill.map((t) => (
                      <li key={t.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-[13px] hover:bg-subtle">
                        <span className="truncate">{t.description}{t.installmentTotal ? ` (${t.installmentNumber}/${t.installmentTotal})` : ""} <span className="text-muted">· {formatDateShort(t.date)}</span></span>
                        <span className="tabular shrink-0 font-medium">{money(t.amount)}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href={`/transactions?categoryId=${selectedCat}`} className="mt-2 block text-center text-xs font-medium text-brand hover:underline">Ver na lista de transações</Link>
                </div>
              ) : (
                <ul className="mt-4 space-y-1">
                  {slices.map((s) => (
                    <li key={s.id}>
                      <button
                        onClick={() => s.id !== "__others" && setSelectedCat(s.id)}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-subtle"
                      >
                        <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: s.color }} />
                        <span className="flex-1 truncate">{s.icon} {s.name}</span>
                        <span className="text-xs text-muted">{s.percent.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%</span>
                        <span className="tabular w-24 text-right font-medium">{money(s.amount)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Transações recentes + contas a vencer */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Transações recentes" action={<Link href="/transactions" className="text-[13px] font-medium text-brand hover:underline">Ver todas</Link>} />
          <div className="px-3 pt-2 pb-3">
            {data.recent.length ? (
              data.recent.map((tx) => <TransactionRow key={tx.id} tx={tx} showDate />)
            ) : (
              <EmptyState icon="🧾" title="Nenhuma transação ainda" action={<Button size="sm" onClick={() => openNew()}><Plus className="h-4 w-4" /> Adicionar</Button>} />
            )}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Próximos vencimentos" description={bills.length ? `${money(pendingBillsTotal)} a pagar este mês` : undefined} action={<Link href="/recurring" className="text-[13px] font-medium text-brand hover:underline">Calendário</Link>} />
          <div className="px-3 pt-2 pb-3">
            {bills.length ? (
              bills.map((b) => (
                <Link key={b.id} href="/recurring" className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-subtle">
                  <IconBubble icon={b.category?.icon ?? "📅"} color={b.category?.color ?? "#94a3b8"} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{b.name}</p>
                    <p className={cn("text-xs", b.overdue ? "font-medium text-expense" : b.daysUntilDue <= 2 ? "font-medium text-warning" : "text-muted")}>
                      {b.overdue ? `Atrasada · venceu ${formatDateShort(b.nextDue)}` : b.daysUntilDue === 0 ? "Vence hoje" : b.daysUntilDue === 1 ? "Vence amanhã" : `Vence em ${b.daysUntilDue} dias · ${formatDateShort(b.nextDue)}`}
                    </p>
                  </div>
                  <span className="tabular text-sm font-semibold">{money(b.amount)}</span>
                </Link>
              ))
            ) : (
              <p className="px-2 py-8 text-center text-sm text-muted">Nenhuma conta pendente este mês ✅</p>
            )}
          </div>
        </Card>
      </div>

      {/* Orçamento, metas e cartões */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader title="Meu orçamento" action={<Link href="/budget" className="text-[13px] font-medium text-brand hover:underline">Gerenciar</Link>} />
          <div className="space-y-4 p-5">
            {budgets.length ? (
              budgets.map((b) => (
                <div key={b.id}>
                  <div className="mb-1.5 flex items-center justify-between text-[13px]">
                    <span className="font-medium">{b.category.icon} {b.category.name}</span>
                    <span className="tabular text-muted"><span className={cn("font-semibold", b.status === "exceeded" ? "text-expense" : "text-foreground")}>{money(b.spent)}</span> / {money(b.amount)}</span>
                  </div>
                  <Progress value={b.percent} color={b.category.color} tone={b.status} />
                  {b.status === "exceeded" && <p className="mt-1 text-[11px] font-medium text-expense">🔴 Você ultrapassou seu orçamento.</p>}
                </div>
              ))
            ) : (
              <p className="py-4 text-center text-sm text-muted">Defina limites por categoria para acompanhar seus gastos. <Link href="/budget" className="font-medium text-brand">Criar orçamento</Link></p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Minhas metas" action={<Link href="/goals" className="text-[13px] font-medium text-brand hover:underline">Ver todas</Link>} />
          <div className="space-y-4 p-5">
            {goals.length ? (
              goals.map((g) => {
                const pct = (g.currentAmount / g.targetAmount) * 100;
                return (
                  <Link key={g.id} href="/goals" className="block">
                    <div className="mb-1.5 flex items-center justify-between text-[13px]">
                      <span className="font-medium">{g.icon} {g.name}</span>
                      <span className="font-semibold">{Math.floor(pct)}%</span>
                    </div>
                    <Progress value={pct} color={g.color} />
                    <p className="tabular mt-1 text-[11px] text-muted">{money(g.currentAmount)} de {money(g.targetAmount)}</p>
                  </Link>
                );
              })
            ) : (
              <p className="py-4 text-center text-sm text-muted">Nenhuma meta ativa. <Link href="/goals" className="font-medium text-brand">Criar meta</Link></p>
            )}
          </div>
        </Card>

        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader title="Cartões" action={<Link href="/cards" className="text-[13px] font-medium text-brand hover:underline">Detalhes</Link>} />
          <div className="space-y-3 p-5">
            {cards.length ? (
              cards.map((c) => (
                <Link key={c.id} href="/cards" className="block rounded-xl border border-border p-3.5 transition-colors hover:bg-subtle">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-medium"><span className="h-5 w-8 rounded-md" style={{ background: c.color }} />{c.name}</span>
                    <span className="text-xs text-muted">vence {formatDateShort(c.due)}</span>
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <p className="text-[11px] text-muted">Fatura atual</p>
                      <p className="tabular text-base font-semibold">{money(c.invoice)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-muted">Disponível</p>
                      <p className="tabular text-sm font-medium">{money(c.available)}</p>
                    </div>
                  </div>
                  <Progress value={c.utilization} className="mt-2.5 h-1.5" tone={c.utilization >= 90 ? "exceeded" : c.utilization >= 75 ? "warning" : "ok"} />
                </Link>
              ))
            ) : (
              <p className="py-4 text-center text-sm text-muted">Nenhum cartão cadastrado. <Link href="/cards" className="font-medium text-brand">Adicionar</Link></p>
            )}
          </div>
        </Card>
      </div>

      {/* Contas */}
      {data.accounts.length > 0 && (
        <Card>
          <CardHeader title="Minhas contas" description={`Saldo total ${money(data.balance)}`} action={<Link href="/accounts" className="text-[13px] font-medium text-brand hover:underline">Gerenciar</Link>} />
          <div className="no-scrollbar flex gap-3 overflow-x-auto p-5">
            {data.accounts.map((a) => (
              <div key={a.id} className="min-w-[180px] flex-1 rounded-xl border border-border p-3.5">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: a.color }} />
                  <span className="truncate text-[13px] font-medium">{a.name}</span>
                </div>
                <p className={cn("tabular mt-2 text-lg font-semibold", a.balance < 0 && "text-expense")}>{money(a.balance)}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
