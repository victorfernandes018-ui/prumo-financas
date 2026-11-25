"use client";

import { ArrowLeftRight, CreditCard, Repeat } from "lucide-react";
import { IconBubble } from "@/components/ui/misc";
import { useMoney } from "@/components/providers/app-data";
import { relativeDayLabel } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { useQuickActions } from "./transaction-modal";
import type { TxView } from "./types";

export function TransactionRow({ tx, showDate }: { tx: TxView; showDate?: boolean }) {
  const money = useMoney();
  const { openEdit } = useQuickActions();
  const isTransfer = tx.type === "TRANSFER";
  const sign = tx.type === "INCOME" ? "+" : tx.type === "EXPENSE" ? "−" : "";

  const subtitle = [
    isTransfer ? (tx.isInvoicePayment ? tx.account?.name : `${tx.account?.name ?? "?"} → ${tx.toAccount?.name ?? "?"}`) : tx.category?.name ?? "Sem categoria",
    tx.creditCard && !tx.isInvoicePayment ? tx.creditCard.name : !isTransfer ? tx.account?.name : null,
    showDate ? relativeDayLabel(tx.date) : null,
  ].filter(Boolean);

  return (
    <button
      type="button"
      onClick={() => openEdit(tx)}
      className="group flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-subtle"
    >
      {isTransfer ? (
        <IconBubble icon={tx.isInvoicePayment ? <CreditCard className="h-4 w-4 text-brand" /> : <ArrowLeftRight className="h-4 w-4 text-brand" />} color="var(--brand)" />
      ) : (
        <IconBubble icon={tx.category?.icon ?? "📦"} color={tx.category?.color ?? "#94a3b8"} />
      )}
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-medium">
          <span className="truncate">{tx.description}</span>
          {tx.installmentTotal && (
            <span className="shrink-0 rounded-md bg-subtle px-1.5 py-px text-[10px] font-semibold text-muted">
              {tx.installmentNumber}/{tx.installmentTotal}
            </span>
          )}
          {(tx.recurrence !== "NONE" || tx.recurrenceParentId) && <Repeat className="h-3 w-3 shrink-0 text-muted" aria-label="Recorrente" />}
        </p>
        <p className="truncate text-xs text-muted">{subtitle.join(" · ")}</p>
      </div>
      <span className={cn("tabular shrink-0 text-sm font-semibold", tx.type === "INCOME" ? "text-income" : isTransfer ? "text-muted" : "text-foreground")}>
        {sign} {money(tx.amount)}
      </span>
    </button>
  );
}

/** Lista agrupada por dia ("Hoje", "Ontem", "qua, 24 set") com subtotal. */
export function TransactionList({ items }: { items: TxView[] }) {
  const money = useMoney();
  const groups = new Map<string, TxView[]>();
  for (const tx of items) {
    const label = relativeDayLabel(tx.date);
    groups.set(label, [...(groups.get(label) ?? []), tx]);
  }
  return (
    <div className="space-y-4">
      {[...groups.entries()].map(([label, txs]) => {
        const net = txs.reduce((s, t) => s + (t.type === "INCOME" ? t.amount : t.type === "EXPENSE" ? -t.amount : 0), 0);
        return (
          <section key={label}>
            <div className="flex items-center justify-between px-2 pb-1">
              <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</h3>
              <span className="tabular text-xs text-muted">{net >= 0 ? "+" : "−"} {money(Math.abs(net))}</span>
            </div>
            <div>{txs.map((tx) => <TransactionRow key={tx.id} tx={tx} />)}</div>
          </section>
        );
      })}
    </div>
  );
}
