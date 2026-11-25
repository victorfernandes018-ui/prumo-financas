import { authed, parseBody } from "@/server/http";
import { createCategory, listCategories } from "@/server/services/categories";
import { categorySchema } from "@/lib/validation";

export const GET = authed(async (_req, { user }) => listCategories(user.id));

export const POST = authed(async (req, { user }) => createCategory(user.id, await parseBody(req, categorySchema)));
