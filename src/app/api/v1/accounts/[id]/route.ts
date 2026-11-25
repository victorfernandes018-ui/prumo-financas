import { authed, parseBody } from "@/server/http";
import { deleteAccount, updateAccount } from "@/server/services/accounts";
import { updateAccountSchema } from "@/lib/validation";

type P = { id: string };

export const PATCH = authed<P>(async (req, { user, params }) => updateAccount(user.id, params.id, await parseBody(req, updateAccountSchema)));

export const DELETE = authed<P>(async (_req, { user, params }) => deleteAccount(user.id, params.id));
