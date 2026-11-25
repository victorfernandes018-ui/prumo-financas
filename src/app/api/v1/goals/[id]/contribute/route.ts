import { authed, parseBody } from "@/server/http";
import { contributeToGoal } from "@/server/services/goals";
import { contributeGoalSchema } from "@/lib/validation";

export const POST = authed<{ id: string }>(async (req, { user, params }) => contributeToGoal(user.id, params.id, await parseBody(req, contributeGoalSchema)));
