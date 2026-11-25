import { authed, parseBody } from "@/server/http";
import { payInvoice } from "@/server/services/cards";
import { payInvoiceSchema } from "@/lib/validation";

export const POST = authed<{ id: string }>(async (req, { user, params }) => payInvoice(user.id, params.id, await parseBody(req, payInvoiceSchema)));
