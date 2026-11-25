import { requireUser } from "@/server/auth/session";
import { listGoals } from "@/server/services/goals";
import { GoalsView } from "@/components/features/goals/goals-view";

export const metadata = { title: "Minhas metas" };

export default async function GoalsPage() {
  const user = await requireUser();
  const goals = await listGoals(user.id);
  return (
    <GoalsView
      goals={goals.map((g) => ({
        id: g.id, name: g.name, icon: g.icon, color: g.color, targetAmount: g.targetAmount, currentAmount: g.currentAmount,
        deadline: g.deadline?.toISOString() ?? null, completedAt: g.completedAt?.toISOString() ?? null,
        contributions: g.contributions.map((c) => ({ id: c.id, amount: c.amount, note: c.note, createdAt: c.createdAt.toISOString() })),
      }))}
    />
  );
}
