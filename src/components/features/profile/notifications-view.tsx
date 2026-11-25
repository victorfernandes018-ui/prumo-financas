"use client";

import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { NotificationItem, type NotificationView } from "@/components/layout/notifications-popover";
import { api } from "@/lib/api-client";

export function NotificationsView({ items }: { items: NotificationView[] }) {
  const router = useRouter();
  const unread = items.filter((n) => !n.read).length;
  return (
    <div>
      <PageHeader
        title="Notificações"
        description={unread ? `${unread} não ${unread === 1 ? "lida" : "lidas"}` : "Você está em dia"}
        action={unread > 0 && <Button variant="outline" onClick={async () => { await api.patch("/notifications"); router.refresh(); }}><CheckCheck className="h-4 w-4" /> Marcar todas como lidas</Button>}
      />
      <Card className="p-2">
        {items.length === 0 ? (
          <EmptyState icon="🔔" title="Nenhuma notificação" description="Alertas sobre faturas, vencimentos, orçamento e metas aparecerão aqui." />
        ) : (
          <div className="divide-y divide-border/60">{items.map((n) => <NotificationItem key={n.id} n={n} />)}</div>
        )}
      </Card>
    </div>
  );
}
