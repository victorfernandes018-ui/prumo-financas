import { authed, notFound } from "@/server/http";
import { db } from "@/server/db";

type P = { id: string };

export const PATCH = authed<P>(async (_req, { user, params }) => {
  const r = await db.notification.updateMany({ where: { id: params.id, userId: user.id }, data: { read: true } });
  if (!r.count) throw notFound("Notificação");
  return { ok: true };
});

export const DELETE = authed<P>(async (_req, { user, params }) => {
  const r = await db.notification.deleteMany({ where: { id: params.id, userId: user.id } });
  if (!r.count) throw notFound("Notificação");
  return { ok: true };
});
