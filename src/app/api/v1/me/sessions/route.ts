import { authed } from "@/server/http";
import { destroyOtherSessions } from "@/server/auth/session";
import { db } from "@/server/db";

export const GET = authed(async (_req, { user }) =>
  db.session.findMany({ where: { userId: user.id }, select: { id: true, userAgent: true, createdAt: true, expiresAt: true }, orderBy: { createdAt: "desc" } }),
);

export const DELETE = authed(async (_req, { user }) => {
  await destroyOtherSessions(user.id);
  return { ok: true };
});
