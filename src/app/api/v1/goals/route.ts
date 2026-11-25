import { authed, parseBody } from "@/server/http";
import { createGoal, listGoals } from "@/server/services/goals";
import { goalSchema } from "@/lib/validation";

export const GET = authed(async (_req, { user }) => listGoals(user.id));

export const POST = authed(async (req, { user }) => createGoal(user.id, user.plan, await parseBody(req, goalSchema)));
