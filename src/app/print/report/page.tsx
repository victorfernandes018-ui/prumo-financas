import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { userHasFeature } from "@/server/features";
import { reportData } from "@/server/services/analytics";
import { addDays, PERIOD_LABELS, PERIOD_PRESETS, periodRange, type PeriodPreset } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/constants";
import { PrintActions } from "./print-actions";

export const metadata = { title: "Relatório" };

// Página própria para impressão/PDF: cores fixas (independentes do tema) e layout A4.
export default async function PrintReportPage({ searchParams }: { searchParams: Promise<{ period?: string; from?: string; to?: string }> }) {
  const user = await requireUser();
  if (!userHasFeature(user, "export_pdf_excel")) redirect("/reports");
  const sp = await searchParams;
  const period: PeriodPreset = PERIOD_PRESETS.includes(sp.period as PeriodPreset) ? (sp.period as PeriodPreset) : "month";
  const range = periodRange(period, user.monthStartDay, sp.from, sp.to);
  const r = await reportData(user.id, range, user.monthStartDay);
  const m = (c: number) => formatMoney(c, user.currency);
  const maxCat = Math.max(...r.byCategory.map((c) => c.amount), 1);
  const rate = r.totals.income ? (r.totals.net / r.totals.income) * 100 : 0;

  return (
    <div className="min-h-dvh bg-white text-zinc-900">
      <style>{`@page { size: A4; margin: 14mm } html, body { background: #fff !important } .tabular { font-variant-numeric: tabular-nums }`}</style>
      <main className="mx-auto max-w-[780px] p-8 print:p-0">
        <PrintActions />
        <header className="flex items-end justify-between border-b-2 border-[#5b5cf0] pb-4">
          <div>
            <p className="text-sm font-bold text-[#5b5cf0]">Prumo</p>
            <h1 className="text-2xl font-semibold">Relatório financeiro</h1>
            <p className="text-sm text-zinc-500">
              {PERIOD_LABELS[period]} · {range.start.toLocaleDateString("pt-BR")} a {addDays(range.end, -1).toLocaleDateString("pt-BR")}
            </p>
          </div>
          <div className="text-right text-sm text-zinc-500">
            <p className="font-medium text-zinc-900">{user.name}</p>
            <p>Gerado em {new Date().toLocaleDateString("pt-BR")}</p>
          </div>
        </header>

        <section className="mt-6 grid grid-cols-4 gap-3">
          {[
            ["Receitas", m(r.totals.income)],
            ["Despesas", m(r.totals.expense)],
            ["Resultado", m(r.totals.net)],
            ["Taxa de economia", `${rate.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`],
          ].map(([l, v]) => (
            <div key={l} className="rounded-lg border border-zinc-200 p-3">
              <p className="text-xs text-zinc-500">{l}</p>
              <p className="tabular mt-1 text-base font-semibold">{v}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 break-inside-avoid">
          <h2 className="mb-3 text-base font-semibold">Gastos por categoria</h2>
          <table className="w-full text-sm">
            <tbody>
              {r.byCategory.map((c) => (
                <tr key={c.categoryId} className="border-b border-zinc-100">
                  <td className="w-44 py-1.5">{c.icon} {c.name}</td>
                  <td className="py-1.5 pr-3">
                    <div className="h-2 rounded-full bg-zinc-100"><div className="h-2 rounded-full" style={{ width: `${(c.amount / maxCat) * 100}%`, background: c.color, printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }} /></div>
                  </td>
                  <td className="w-12 py-1.5 text-right text-zinc-500">{c.percent.toFixed(0)}%</td>
                  <td className="tabular w-28 py-1.5 text-right font-medium">{m(c.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-zinc-500">Essenciais: {m(r.essential)} · Supérfluos: {m(r.superfluous)}</p>
        </section>

        <section className="mt-8 break-inside-avoid">
          <h2 className="mb-3 text-base font-semibold">Comparação mensal</h2>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-zinc-300 text-left text-xs text-zinc-500"><th className="py-1.5">Mês</th><th className="text-right">Receitas</th><th className="text-right">Despesas</th><th className="text-right">Resultado</th></tr></thead>
            <tbody>
              {r.comparison.map((c) => (
                <tr key={c.label} className="border-b border-zinc-100">
                  <td className="py-1.5">{c.label}</td>
                  <td className="tabular text-right">{m(c.income)}</td>
                  <td className="tabular text-right">{m(c.expense)}</td>
                  <td className="tabular text-right font-medium">{m(c.income - c.expense)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-8 grid grid-cols-2 gap-6 break-inside-avoid">
          <div>
            <h2 className="mb-3 text-base font-semibold">Maiores despesas</h2>
            <ol className="space-y-1 text-sm">
              {r.topExpenses.map((t, i) => (
                <li key={t.id} className="flex justify-between gap-2 border-b border-zinc-100 py-1">
                  <span className="truncate">{i + 1}. {t.description}</span>
                  <span className="tabular shrink-0 font-medium">{m(t.amount)}</span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h2 className="mb-3 text-base font-semibold">Formas de pagamento</h2>
            <ul className="space-y-1 text-sm">
              {r.methods.map((x) => (
                <li key={x.method} className="flex justify-between border-b border-zinc-100 py-1">
                  <span>{PAYMENT_METHOD_LABELS[x.method as PaymentMethod] ?? "Outro"}</span>
                  <span className="tabular font-medium">{m(x.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <footer className="mt-10 border-t border-zinc-200 pt-3 text-center text-[11px] text-zinc-400">
          Relatório gerado pelo Prumo com base nos lançamentos registrados pelo usuário.
        </footer>
      </main>
    </div>
  );
}
