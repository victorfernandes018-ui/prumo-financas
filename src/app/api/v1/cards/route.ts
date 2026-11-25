import { authed, parseBody } from "@/server/http";
import { cardsOverview, createCard } from "@/server/services/cards";
import { creditCardSchema } from "@/lib/validation";

export const GET = authed(async (_req, { user }) => cardsOverview(user.id));

export const POST = authed(async (req, { user }) => createCard(user.id, user.plan, await parseBody(req, creditCardSchema)));
