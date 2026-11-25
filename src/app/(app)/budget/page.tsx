import { requireUser } from "@/server/auth/session";
import { budgetsWithSpending } from "@/server/services/budgets";
import { categoryBreakdown } from "@/server/services/analytics";
import { BudgetView } from "@/components/features/budget/budget-view";
import { financialMonth } from "@/lib/dates";

export const metadata = { title: "Meu orçamento" };

export default async function BudgetPage() {
  const user = await requireUser();
  const [budgets, spending] = await Promise.all([
    budgetsWithSpending(user.id, user.monthStartDay),
    categoryBreakdown(user.id, financialMonth(new Date(), user.monthStartDay)),
  ]);
  return <BudgetView budgets={budgets} spending={spending.map((s) => ({ categoryId: s.categoryId, amount: s.amount }))} />;
}
