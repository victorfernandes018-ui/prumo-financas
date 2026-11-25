import { requireUser } from "@/server/auth/session";
import { listNotifications } from "@/server/services/insights";
import { NotificationsView } from "@/components/features/profile/notifications-view";

export const metadata = { title: "Notificações" };

export default async function NotificationsPage() {
  const user = await requireUser();
  return <NotificationsView items={await listNotifications(user.id, 100)} />;
}
