import { authed } from "@/server/http";
import { dashboardData } from "@/server/services/analytics";

export const GET = authed(async (_req, { user }) => dashboardData(user.id, user.monthStartDay));
