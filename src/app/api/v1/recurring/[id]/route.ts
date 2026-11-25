import { authed, parseBody } from "@/server/http";
import { deleteRecurring, updateRecurring } from "@/server/services/recurring";
import { updateRecurringExpenseSchema } from "@/lib/validation";

type P = { id: string };

export const PATCH = authed<P>(async (req, { user, params }) => updateRecurring(user.id, params.id, await parseBody(req, updateRecurringExpenseSchema)));

export const DELETE = authed<P>(async (_req, { user, params }) => {
  await deleteRecurring(user.id, params.id);
  return { ok: true };
});
