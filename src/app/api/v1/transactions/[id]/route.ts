import { authed, parseBody } from "@/server/http";
import { deleteTransaction, getTransaction, updateTransaction } from "@/server/services/transactions";
import { updateTransactionSchema } from "@/lib/validation";

type P = { id: string };

export const GET = authed<P>(async (_req, { user, params }) => getTransaction(user.id, params.id));

export const PATCH = authed<P>(async (req, { user, params }) => updateTransaction(user.id, params.id, await parseBody(req, updateTransactionSchema)));

export const DELETE = authed<P>(async (req, { user, params }) => {
  const scope = new URL(req.url).searchParams.get("scope") === "all" ? "all" : "single";
  return deleteTransaction(user.id, params.id, scope);
});
