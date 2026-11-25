import { z } from "zod";
import { authed, parseQuery } from "@/server/http";
import { suggestCategories } from "@/server/services/categories";

const schema = z.object({ q: z.string().max(80).default(""), type: z.enum(["INCOME", "EXPENSE"]).default("EXPENSE") });

export const GET = authed(async (req, { user }) => {
  const { q, type } = parseQuery(req, schema);
  return suggestCategories(user.id, q, type);
});
