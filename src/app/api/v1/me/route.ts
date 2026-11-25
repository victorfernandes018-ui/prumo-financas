import { z } from "zod";
import { authed, parseBody } from "@/server/http";
import { destroyCurrentSession } from "@/server/auth/session";
import { deleteUser, updateProfile } from "@/server/services/users";
import { updateProfileSchema } from "@/lib/validation";

export const GET = authed(async (_req, { user }) => user);

export const PATCH = authed(async (req, { user }) => updateProfile(user.id, await parseBody(req, updateProfileSchema)));

export const DELETE = authed(async (req, { user }) => {
  const { password } = await parseBody(req, z.object({ password: z.string().max(128).default("") }));
  await deleteUser(user.id, password);
  await destroyCurrentSession();
  return { ok: true };
});
