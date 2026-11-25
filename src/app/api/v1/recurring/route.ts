import { authed, parseBody } from "@/server/http";
import { createRecurring, recurringWithStatus } from "@/server/services/recurring";
import { recurringExpenseSchema } from "@/lib/validation";

export const GET = authed(async (_req, { user }) => recurringWithStatus(user.id, user.monthStartDay));

export const POST = authed(async (req, { user }) => createRecurring(user.id, await parseBody(req, recurringExpenseSchema)));
