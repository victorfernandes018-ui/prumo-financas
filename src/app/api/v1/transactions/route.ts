import { authed, parseBody, parseQuery } from "@/server/http";
import { createTransaction, listTransactions } from "@/server/services/transactions";
import { transactionFiltersSchema, transactionSchema } from "@/lib/validation";

export const GET = authed(async (req, { user }) => listTransactions(user.id, parseQuery(req, transactionFiltersSchema)));

export const POST = authed(async (req, { user }) => createTransaction(user.id, await parseBody(req, transactionSchema)));
