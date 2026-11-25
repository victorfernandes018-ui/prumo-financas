import { authed } from "@/server/http";
import { deleteBudget } from "@/server/services/budgets";

export const DELETE = authed<{ id: string }>(async (_req, { user, params }) => {
  await deleteBudget(user.id, params.id);
  return { ok: true };
});
