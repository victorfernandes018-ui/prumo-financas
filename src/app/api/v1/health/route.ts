import { authed } from "@/server/http";
import { healthReport } from "@/server/services/health";

export const GET = authed(async (_req, { user }) => healthReport(user.id, user.monthStartDay, user.currency));
