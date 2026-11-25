"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/misc";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export interface NotificationView {
  id: string;
  kind: string;
  title: string;
  message: string;
  href: string | null;
  read: boolean;
  createdAt: string | Date;
}

export const KIND_STYLES: Record<string, string> = {
  WARNING: "bg-warning-soft",
  DANGER: "bg-expense-soft",
  SUCCESS: "bg-income-soft",
  GOAL: "bg-brand-soft",
  TIP: "bg-warning-soft",
  INFO: "bg-brand-soft",
};

export function timeAgo(d: string | Date) {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  const days = Math.floor(diff / 86400);
  return days === 1 ? "ontem" : `há ${days} dias`;
}

export function NotificationItem({ n, onOpen }: { n: NotificationView; onOpen?: () => void }) {
  const router = useRouter();
  // A mensagem já começa com um emoji; extraímos para o "ícone"
  const match = n.message.match(/^(\p{Extended_Pictographic}️?)\s*/u);
  const icon = match?.[1] ?? "🔔";
  const text = match ? n.message.slice(match[0].length) : n.message;
  return (
    <button
      type="button"
      onClick={() => {
        if (!n.read) api.patch(`/notifications/${n.id}`).catch(() => {});
        onOpen?.();
        if (n.href) router.push(n.href);
        router.refresh();
      }}
      className={cn("flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors hover:bg-subtle", !n.read && "bg-brand-soft/40")}
    >
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base", KIND_STYLES[n.kind] ?? "bg-subtle")} aria-hidden>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-snug">{text}</p>
        <p className="mt-1 text-[11px] text-muted">{timeAgo(n.createdAt)}</p>
      </div>
      {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" aria-label="Não lida" />}
    </button>
  );
}

export function NotificationsPopover({ initialUnread }: { initialUnread: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationView[] | null>(null);
  const [unread, setUnread] = useState(initialUnread);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUnread(initialUnread);
  }, [initialUnread]);

  useEffect(() => {
    if (!open) return;
    api.get<{ items: NotificationView[]; unread: number }>("/notifications").then((d) => {
      setItems(d.items);
      setUnread(d.unread);
    }).catch(() => setItems([]));
    const onClick = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const markAll = async () => {
    await api.patch("/notifications");
    setItems((list) => list?.map((n) => ({ ...n, read: true })) ?? null);
    setUnread(0);
    router.refresh();
  };

  const bell = (
    <>
      <Bell className="h-[18px] w-[18px]" />
      {unread > 0 && (
        <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 animate-pop items-center justify-center rounded-full bg-expense px-1 text-[9px] font-bold text-white ring-2 ring-background">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </>
  );

  return (
    <div className="relative" ref={ref}>
      {/* Celular: página dedicada; desktop: popover */}
      <Link href="/notifications" className="relative flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:bg-subtle sm:hidden" aria-label={`Notificações (${unread} não lidas)`}>
        {bell}
      </Link>
      <button onClick={() => setOpen((o) => !o)} className="relative hidden h-10 w-10 items-center justify-center rounded-xl text-muted hover:bg-subtle hover:text-foreground sm:flex" aria-label={`Notificações (${unread} não lidas)`} aria-expanded={open}>
        {bell}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[380px] animate-scale-in rounded-2xl border border-border bg-card shadow-pop">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h3 className="text-sm font-semibold">Notificações</h3>
            {unread > 0 && (
              <button onClick={markAll} className="flex items-center gap-1 text-xs font-medium text-brand hover:underline"><CheckCheck className="h-3.5 w-3.5" /> Marcar todas como lidas</button>
            )}
          </div>
          <div className="max-h-[420px] overflow-y-auto p-2">
            {items === null ? (
              <div className="space-y-2 p-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}</div>
            ) : items.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted">Tudo em dia por aqui ✨</p>
            ) : (
              items.slice(0, 12).map((n) => <NotificationItem key={n.id} n={n} onOpen={() => setOpen(false)} />)
            )}
          </div>
          <Link href="/notifications" onClick={() => setOpen(false)} className="block border-t border-border py-3 text-center text-xs font-medium text-muted hover:text-foreground">Ver todas</Link>
        </div>
      )}
    </div>
  );
}
