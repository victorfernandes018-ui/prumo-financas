import { authed } from "@/server/http";
import { db } from "@/server/db";
import { listNotifications, unreadCount } from "@/server/services/insights";

export const GET = authed(async (_req, { user }) => ({ items: await listNotifications(user.id), unread: await unreadCount(user.id) }));

// Marca todas como lidas
export const PATCH = authed(async (_req, { user }) => {
  await db.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
  return { ok: true };
});
