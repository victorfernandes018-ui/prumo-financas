"use client";

import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Crown, Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge, EmptyState, PageHeader, Progress, Segmented } from "@/components/ui/misc";
import { BalanceLine, ChartLegend, DonutChart, FlowChart, foldSlices, IncomeExpenseBars, type FlowPoint } from "@/components/charts/charts";
import { useAppData, useMoney } from "@/components/providers/app-data";
import { useToast } from "@/components/ui/toast";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/constants";
import { formatDateShort, PERIOD_LABELS, PERIOD_PRESETS, type PeriodPreset } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { TxView } from "@/components/features/transactions/types";
import { TransactionRow } from "@/components/features/transactions/transaction-row";

interface Slice { categoryId: string; name: string; icon: string; color: string; amount: number; percent: number; count: number }
interface ReportProps {
  period: PeriodPreset;
  range: { from: string; to: string };
  report: {
    totals: { income: number; expense: number; net: number; count: number };
    byCategory: Slice[];
    byIncomeCategory: Slice[];
    series: FlowPoint[];
    comparison: FlowPoint[];
    patrimony: { label: string; balance: number | null }[];
    topExpenses: TxView[];
    essential: number;
    superfluous: number;
    methods: { method: string; amount: number }[];
    granularity: "day" | "month";
  };
  recurring: { id: string; name: string; amount: number; recurrence: string; icon: string }[];
  installments: { id: string; description: string; installmentAmount: number; current: number; total: number; remaining: number; card: string }[];
  canExport: boolean;
  exportQuery: string;
}

export function ReportsView({ period, range, report, recurring, installments, canExport, exportQuery }: ReportProps) {
  const router = useRouter();
  const pathname = usePathname();
  const money = useMoney();
  const toast = useToast();
  const { user } = useAppData();
  const [pending, start] = useTransition();
  const [catType, setCatType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);

  const go = (p: PeriodPreset, extra = "") => start(() => router.replace(`${pathname}?period=${p}${extra}`, { scroll: false }));
  const cats = catType === "EXPENSE" ? report.byCategory : report.byIncomeCategory;
  const slices = useMemo(() => foldSlices(cats.map((c) => ({ id: c.categoryId, name: c.name, icon: c.icon, color: c.color, amount: c.amount, percent: c.percent }))), [cats]);
  const essentialPct = report.totals.expense ? (report.essential / report.totals.expense) * 100 : 0;
  const recurringMonthly = recurring.reduce((s, r) => s + (r.recurrence === "YEARLY" ? Math.round(r.amount / 12) : r.amount), 0);
  const savingsRate = report.totals.income ? (report.totals.net / report.totals.income) * 100 : 0;
  const empty = report.totals.count === 0;

  return (
    <div className={cn("transition-opacity", pending && "opacity-60")}>
      <PageHeader
        title="Relatórios"
        description={`${formatDateShort(range.from)} a ${formatDateShort(range.to)}`}
        action={
          <div className="flex items-center gap-2">
            {pending && <Loader2 className="h-4 w-4 animate-spin text-muted" />}
            <a href={`/api/v1/export?format=csv`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3.5 text-sm font-medium hover:bg-subtle"><Download className="h-4 w-4" /> CSV</a>
            {canExport ? (
              <>
                <a href={`/print/report?${exportQuery}`} target="_blank" rel="noopener" className="hidden h-10 items-center gap-2 rounded-xl border border-border bg-card px-3.5 text-sm font-medium hover:bg-subtle sm:inline-flex"><FileText className="h-4 w-4" /> PDF</a>
                <a href={`/api/v1/export?format=xlsx&${exportQuery}`} className="hidden h-10 items-center gap-2 rounded-xl border border-border bg-card px-3.5 text-sm font-medium hover:bg-subtle sm:inline-flex"><FileSpreadsheet className="h-4 w-4" /> Excel</a>
              </>
            ) : (
              [{ l: "PDF", i: FileText }, { l: "Excel", i: FileSpreadsheet }].map(({ l, i: Icon }) => (
                <button key={l} onClick={() => toast.info(`Exportação ${l} é Premium`, "Assine o Prumo Premium para exportar relatórios completos.")} className="hidden h-10 items-center gap-2 rounded-xl border border-border bg-card px-3.5 text-sm font-medium text-muted hover:bg-subtle sm:inline-flex">
                  <Icon className="h-4 w-4" /> {l} <Crown className="h-3.5 w-3.5 text-warning" />
                </button>
              ))
            )}
          </div>
        }
      />

      {/* Filtros de período */}
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          {PERIOD_PRESETS.map((p) => (
            <button key={p} onClick={() => p !== "custom" && go(p)} className={cn("shrink-0 rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors", period === p ? "bg-foreground text-background" : "border border-border bg-card text-muted hover:text-foreground")} aria-pressed={period === p}>
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); go("custom", `&from=${from}&to=${to}`); }} className="flex items-center gap-2 lg:ml-auto">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-auto text-xs" aria-label="Data inicial" />
          <span className="text-xs text-muted">até</span>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-auto text-xs" aria-label="Data final" />
          <button type="submit" className="h-9 rounded-xl bg-brand px-3 text-xs font-medium text-white">Aplicar</button>
        </form>
      </div>

      {/* Resumo */}
      <div className="stagger mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Receitas", value: money(report.totals.income), cls: "text-income" },
          { label: "Despesas", value: money(report.totals.expense), cls: "text-expense" },
          { label: "Resultado", value: money(report.totals.net), cls: report.totals.net < 0 ? "text-expense" : "" },
          { label: "Taxa de economia", value: `${savingsRate.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`, cls: savingsRate >= 20 ? "text-income" : savingsRate < 0 ? "text-expense" : "" },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-muted">{s.label}</p>
            <p className={cn("tabular mt-1 truncate text-lg font-semibold sm:text-xl", s.cls)}>{s.value}</p>
          </Card>
        ))}
      </div>

      {empty ? (
        <Card><EmptyState icon="📊" title="Sem movimentações neste período" description="Escolha outro período ou registre novas transações." /></Card>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader title="Gastos por período" description={report.granularity === "day" ? "Por dia" : "Por mês"} />
              <div className="px-3 pt-3 pb-4 sm:px-5">
                <ChartLegend keys={["income", "expense", "balance"]} className="mb-3" />
                <FlowChart data={report.series} mode="bars" currency={user.currency} height={270} />
              </div>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader title="Por categoria" action={<Segmented size="sm" value={catType} onChange={setCatType} options={[{ value: "EXPENSE", label: "Despesas" }, { value: "INCOME", label: "Receitas" }]} />} />
              <div className="p-5">
                {cats.length ? (
                  <>
                    <DonutChart data={slices} total={catType === "EXPENSE" ? report.totals.expense : report.totals.income} currency={user.currency} size={170} />
                    <table className="mt-4 w-full text-[13px]">
                      <caption className="sr-only">Valores por categoria</caption>
                      <tbody>
                        {cats.map((c) => (
                          <tr key={c.categoryId} className="border-b border-border last:border-0">
                            <td className="py-2"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-[3px] align-middle" style={{ background: c.color }} />{c.icon} {c.name}</td>
                            <td className="py-2 text-right text-xs text-muted">{c.count}x</td>
                            <td className="py-2 text-right text-xs text-muted">{c.percent.toFixed(0)}%</td>
                            <td className="tabular py-2 text-right font-medium">{money(c.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                ) : <p className="py-10 text-center text-sm text-muted">Nada por aqui neste período.</p>}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Comparação mensal" description="Receitas × despesas nos últimos 6 meses" />
              <div className="px-3 pt-3 pb-4 sm:px-5">
                <ChartLegend keys={["income", "expense"]} className="mb-3" />
                <IncomeExpenseBars data={report.comparison} currency={user.currency} />
              </div>
            </Card>
            <Card>
              <CardHeader title="Evolução do patrimônio" description="Saldo total das contas ao fim de cada mês" />
              <div className="px-3 pt-3 pb-4 sm:px-5">
                <BalanceLine data={report.patrimony} currency={user.currency} height={264} />
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Maiores despesas" />
              <div className="px-3 pt-2 pb-3">
                {report.topExpenses.map((tx, i) => (
                  <div key={tx.id} className="flex items-center gap-1">
                    <span className="w-6 shrink-0 text-center text-xs font-semibold text-muted">{i + 1}</span>
                    <div className="min-w-0 flex-1"><TransactionRow tx={tx} showDate /></div>
                  </div>
                ))}
              </div>
            </Card>
            <div className="space-y-4">
              <Card className="p-5">
                <p className="text-[15px] font-semibold">Essenciais × supérfluos</p>
                <div className="mt-4 flex h-3 overflow-hidden rounded-full">
                  <div className="h-full border-r-2 border-card bg-[#2a78d6]" style={{ width: `${essentialPct}%` }} />
                  <div className="h-full bg-[#e87ba4]" style={{ width: `${100 - essentialPct}%` }} />
                </div>
                <div className="mt-3 space-y-1.5 text-[13px]">
                  <p className="flex justify-between"><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-[#2a78d6]" />Essenciais</span><b className="tabular">{money(report.essential)} · {essentialPct.toFixed(0)}%</b></p>
                  <p className="flex justify-between"><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-[#e87ba4]" />Supérfluos</span><b className="tabular">{money(report.superfluous)} · {(100 - essentialPct).toFixed(0)}%</b></p>
                </div>
              </Card>
              <Card className="p-5">
                <p className="mb-3 text-[15px] font-semibold">Formas de pagamento</p>
                <div className="space-y-3">
                  {report.methods.map((m) => (
                    <div key={m.method}>
                      <div className="mb-1 flex justify-between text-[13px]"><span>{PAYMENT_METHOD_LABELS[m.method as PaymentMethod] ?? "Outro"}</span><b className="tabular">{money(m.amount)}</b></div>
                      <Progress value={(m.amount / Math.max(report.totals.expense, 1)) * 100} className="h-1.5" />
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Gastos recorrentes" description={`${money(recurringMonthly)} por mês em contas fixas`} />
              <ul className="divide-y divide-border px-5 pt-2 pb-3">
                {recurring.map((r) => (
                  <li key={r.id} className="flex justify-between py-2.5 text-[13px]"><span>{r.icon} {r.name}{r.recurrence === "YEARLY" && <Badge className="ml-2">anual</Badge>}</span><b className="tabular">{money(r.amount)}</b></li>
                ))}
                {!recurring.length && <li className="py-6 text-center text-sm text-muted">Nenhuma conta fixa ativa.</li>}
              </ul>
            </Card>
            <Card>
              <CardHeader title="Parcelamentos" description={installments.length ? `${money(installments.reduce((s, i) => s + i.remaining, 0))} restantes · ${money(installments.reduce((s, i) => s + i.installmentAmount, 0))}/mês` : undefined} />
              <ul className="divide-y divide-border px-5 pt-2 pb-3">
                {installments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-[13px]">
                    <span className="min-w-0 truncate">{p.description} <span className="text-muted">· {p.card}</span></span>
                    <span className="shrink-0 text-xs text-muted">{p.current}/{p.total}</span>
                    <b className="tabular shrink-0">{money(p.installmentAmount)}</b>
                  </li>
                ))}
                {!installments.length && <li className="py-6 text-center text-sm text-muted">Nenhuma compra parcelada em aberto. 👏</li>}
              </ul>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
