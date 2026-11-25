import { authed, parseBody } from "@/server/http";
import { deleteCategory, updateCategory } from "@/server/services/categories";
import { categorySchema } from "@/lib/validation";

type P = { id: string };

export const PATCH = authed<P>(async (req, { user, params }) => updateCategory(user.id, params.id, await parseBody(req, categorySchema.partial())));

export const DELETE = authed<P>(async (_req, { user, params }) => {
  await deleteCategory(user.id, params.id);
  return { ok: true };
});
