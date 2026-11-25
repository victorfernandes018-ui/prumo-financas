import { z } from "zod";
import { authed, parseQuery } from "@/server/http";
import { reportData } from "@/server/services/analytics";
import { PERIOD_PRESETS, periodRange } from "@/lib/dates";

const schema = z.object({ period: z.enum(PERIOD_PRESETS).default("month"), from: z.string().optional(), to: z.string().optional() });

export const GET = authed(async (req, { user }) => {
  const q = parseQuery(req, schema);
  return reportData(user.id, periodRange(q.period, user.monthStartDay, q.from, q.to), user.monthStartDay);
});
