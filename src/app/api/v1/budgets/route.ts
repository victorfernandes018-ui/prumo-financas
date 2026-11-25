import { authed, parseBody } from "@/server/http";
import { budgetsWithSpending, upsertBudget } from "@/server/services/budgets";
import { budgetSchema } from "@/lib/validation";

export const GET = authed(async (_req, { user }) => budgetsWithSpending(user.id, user.monthStartDay));

export const PUT = authed(async (req, { user }) => {
  const { categoryId, amount } = await parseBody(req, budgetSchema);
  return upsertBudget(user.id, categoryId, amount);
});
