import { z } from "zod";
import { authed, parseQuery } from "@/server/http";
import { cardInvoice } from "@/server/services/cards";

export const GET = authed<{ id: string }>(async (req, { user, params }) => {
  const { key } = parseQuery(req, z.object({ key: z.string().regex(/^\d{4}-\d{2}$/) }));
  return cardInvoice(user.id, params.id, key);
});
