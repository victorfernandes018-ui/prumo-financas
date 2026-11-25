import { requireUser } from "@/server/auth/session";
import { dashboardData } from "@/server/services/analytics";
import { budgetsWithSpending } from "@/server/services/budgets";
import { cardsOverview } from "@/server/services/cards";
import { listGoals } from "@/server/services/goals";
import { healthReport } from "@/server/services/health";
import { recurringWithStatus } from "@/server/services/recurring";
import { DashboardView } from "@/components/features/dashboard/dashboard-view";

export const metadata = { title: "Início" };

export default async function DashboardPage() {
  const user = await requireUser();
  const [data, budgets, goals, bills, cards, health] = await Promise.all([
    dashboardData(user.id, user.monthStartDay),
    budgetsWithSpending(user.id, user.monthStartDay),
    listGoals(user.id),
    recurringWithStatus(user.id, user.monthStartDay),
    cardsOverview(user.id),
    healthReport(user.id, user.monthStartDay, user.currency),
  ]);

  const pendingBills = bills.filter((b) => b.active && b.dueThisMonth && !b.paidThisMonth);

  return (
    <DashboardView
      data={data}
      budgets={budgets.slice(0, 4)}
      goals={goals.filter((g) => !g.completedAt).slice(0, 3).map((g) => ({ id: g.id, name: g.name, icon: g.icon, color: g.color, targetAmount: g.targetAmount, currentAmount: g.currentAmount }))}
      bills={pendingBills.sort((a, b) => a.daysUntilDue - b.daysUntilDue).slice(0, 4)}
      pendingBillsTotal={pendingBills.reduce((s, b) => s + b.amount, 0)}
      cards={cards.map((c) => ({ id: c.id, name: c.name, color: c.color, limit: c.limit, available: c.available, utilization: c.utilization, invoice: c.currentInvoice.total, due: c.currentInvoice.due }))}
      health={{ score: health.score, label: health.label, emoji: health.emoji, message: health.message, hasData: health.hasData }}
    />
  );
}
