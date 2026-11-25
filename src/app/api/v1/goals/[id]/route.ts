import { authed, parseBody } from "@/server/http";
import { deleteGoal, updateGoal } from "@/server/services/goals";
import { updateGoalSchema } from "@/lib/validation";

type P = { id: string };

export const PATCH = authed<P>(async (req, { user, params }) => updateGoal(user.id, params.id, await parseBody(req, updateGoalSchema)));

export const DELETE = authed<P>(async (_req, { user, params }) => {
  await deleteGoal(user.id, params.id);
  return { ok: true };
});
