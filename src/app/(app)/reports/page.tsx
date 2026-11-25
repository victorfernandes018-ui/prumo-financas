import { requireUser } from "@/server/auth/session";
import { userHasFeature } from "@/server/features";
import { reportData } from "@/server/services/analytics";
import { installmentPurchases } from "@/server/services/cards";
import { recurringWithStatus } from "@/server/services/recurring";
import { ReportsView } from "@/components/features/reports/reports-view";
import { PERIOD_PRESETS, periodRange, toDateInput, addDays, type PeriodPreset } from "@/lib/dates";

export const metadata = { title: "Relatórios" };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ period?: string; from?: string; to?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const period: PeriodPreset = PERIOD_PRESETS.includes(sp.period as PeriodPreset) ? (sp.period as PeriodPreset) : "month";
  const range = periodRange(period, user.monthStartDay, sp.from, sp.to);
  const [report, recurring, installments] = await Promise.all([
    reportData(user.id, range, user.monthStartDay),
    recurringWithStatus(user.id, user.monthStartDay),
    installmentPurchases(user.id),
  ]);
  return (
    <ReportsView
      period={period}
      range={{ from: toDateInput(range.start), to: toDateInput(addDays(range.end, -1)) }}
      report={report}
      recurring={recurring.filter((r) => r.active).map((r) => ({ id: r.id, name: r.name, amount: r.amount, recurrence: r.recurrence, icon: r.category?.icon ?? "📅" }))}
      installments={installments.map((p) => ({ id: p.id, description: p.description, installmentAmount: p.installmentAmount, current: p.currentInstallment, total: p.installments, remaining: p.remaining, card: p.card.name }))}
      canExport={userHasFeature(user, "export_pdf_excel")}
      exportQuery={new URLSearchParams({ period, ...(sp.from ? { from: sp.from } : {}), ...(sp.to ? { to: sp.to } : {}) }).toString()}
    />
  );
}
