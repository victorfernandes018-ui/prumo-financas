import { authed, parseBody } from "@/server/http";
import { deleteCard, updateCard } from "@/server/services/cards";
import { updateCreditCardSchema } from "@/lib/validation";

type P = { id: string };

export const PATCH = authed<P>(async (req, { user, params }) => updateCard(user.id, params.id, await parseBody(req, updateCreditCardSchema)));

export const DELETE = authed<P>(async (_req, { user, params }) => deleteCard(user.id, params.id));
