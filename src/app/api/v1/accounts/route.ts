import { authed, parseBody } from "@/server/http";
import { accountBalances, createAccount } from "@/server/services/accounts";
import { accountSchema } from "@/lib/validation";

export const GET = authed(async (_req, { user }) => accountBalances(user.id));

export const POST = authed(async (req, { user }) => createAccount(user.id, user.plan, await parseBody(req, accountSchema)));
