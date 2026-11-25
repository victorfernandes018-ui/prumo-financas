import { authed, parseBody } from "@/server/http";
import { payRecurring } from "@/server/services/recurring";
import { payRecurringSchema } from "@/lib/validation";

export const POST = authed<{ id: string }>(async (req, { user, params }) => payRecurring(user.id, params.id, await parseBody(req, payRecurringSchema)));
