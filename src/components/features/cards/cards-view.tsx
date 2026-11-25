"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CreditCard, Loader2, MoreHorizontal, Plus, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ColorPicker } from "@/components/ui/color-picker";
import { Field, Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { MoneyInput } from "@/components/ui/money-input";
import { Badge, EmptyState, PageHeader, Progress } from "@/components/ui/misc";
import { useConfirm } from "@/components/ui/confirm";
import { useAppData, useMoney } from "@/components/providers/app-data";
import { TransactionRow } from "@/components/features/transactions/transaction-row";
import type { TxView } from "@/components/features/transactions/types";
import { api } from "@/lib/api-client";
import { INVOICE_STATUS_LABELS, type InvoiceStatus } from "@/lib/cards";
import { CARD_BRANDS } from "@/lib/constants";
import { formatDateShort, monthKeyLabel, toDateInput } from "@/lib/dates";
import { useMutation } from "@/lib/use-mutation";
import { cn } from "@/lib/utils";

interface Invoice { key: string; label: string; total: number; unpaid: number; status: InvoiceStatus; closing: string; due: string }
interface CardData {
  id: string; name: string; bank: string; brand: string | null; color: string; limit: number; closingDay: number; dueDay: number;
  used: number; available: number; utilization: number; currentInvoice: Invoice; nextInvoice: Invoice; totalInstallments: number; invoices: Invoice[];
}
interface Purchase {
  id: string; description: string; totalAmount: number; installments: number; installmentAmount: number; currentInstallment: number;
  remaining: number; purchaseDate: string; card: { id: string; name: string; color: string }; category: { name: string; icon: string; color: string } | null;
}

const STATUS_TONE: Record<InvoiceStatus, "brand" | "warning" | "income" | "expense" | "neutral"> = {
  OPEN: "brand", CLOSED: "warning", PAID: "income", OVERDUE: "expense", FUTURE: "neutral",
};

function CardVisual({ card, onEdit }: { card: CardData; onEdit: () => void }) {
  const money = useMoney();
  return (
    <div className="relative aspect-[1.586] w-full max-w-[380px] overflow-hidden rounded-2xl p-5 text-white shadow-xl" style={{ background: `linear-gradient(135deg, ${card.color}, color-mix(in srgb, ${card.color} 55%, #000))` }}>
      <div className="pointer-events-none absolute -top-16 -right-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-white/70">{card.bank}</p>
            <p className="text-lg font-semibold">{card.name}</p>
          </div>
          <button onClick={onEdit} className="rounded-lg bg-white/10 p-1.5 hover:bg-white/20" aria-label="Editar cartão"><MoreHorizontal className="h-4 w-4" /></button>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="h-7 w-10 rounded-md bg-gradient-to-br from-amber-200 to-amber-400 opacity-90" />
          <Wifi className="h-4 w-4 rotate-90 text-white/70" />
        </div>
        <div className="mt-auto flex items-end justify-between">
          <div>
            <p className="text-[11px] text-white/70">Limite disponível</p>
            <p className="tabular text-xl font-semibold">{money(card.available)}</p>
          </div>
          <p className="text-sm font-semibold tracking-wide uppercase opacity-80">{card.brand ?? ""}</p>
        </div>
      </div>
    </div>
  );
}

function InvoicePanel({ card }: { card: CardData }) {
  const money = useMoney();
  const { accounts } = useAppData();
  const [key, setKey] = useState(card.currentInvoice.key);
  const [items, setItems] = useState<TxView[] | null>(null);
  const [paying, setPaying] = useState(false);
  const invoice = card.invoices.find((i) => i.key === key) ?? card.currentInvoice;
  const visible = card.invoices.filter((i) => i.total > 0 || i.key === card.currentInvoice.key || i.key === card.nextInvoice.key).slice(-8);

  useEffect(() => {
    setItems(null);
    api.get<TxView[]>(`/cards/${card.id}/invoice?key=${key}`).then(setItems).catch(() => setItems([]));
  }, [card.id, key, card.used]);

  return (
    <div>
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-3">
        {visible.map((i) => (
          <button key={i.key} onClick={() => setKey(i.key)} className={cn("shrink-0 rounded-xl border px-3 py-2 text-left transition-colors", key === i.key ? "border-brand bg-brand-soft" : "border-border hover:bg-subtle")}>
            <p className="text-[11px] font-medium text-muted capitalize">{monthKeyLabel(i.key, true)}</p>
            <p className="tabular text-sm font-semibold">{money(i.total)}</p>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-subtle p-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold capitalize">Fatura de {invoice.label}</p>
            <Badge tone={STATUS_TONE[invoice.status]}>{INVOICE_STATUS_LABELS[invoice.status]}</Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted">Fecha em {formatDateShort(invoice.closing)} · vence em {formatDateShort(invoice.due)}</p>
        </div>
        <div className="text-right">
          <p className="tabular text-xl font-semibold">{money(invoice.total)}</p>
          {invoice.unpaid > 0 && invoice.status !== "FUTURE" && (
            <Button size="sm" className="mt-1" onClick={() => setPaying(true)} disabled={!accounts.length}>Pagar fatura</Button>
          )}
          {invoice.status === "PAID" && <p className="flex items-center justify-end gap-1 text-xs font-medium text-income"><CheckCircle2 className="h-3.5 w-3.5" /> Paga</p>}
        </div>
      </div>
      <div className="mt-2">
        {items === null ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted" /></div>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">Nenhuma compra nesta fatura.</p>
        ) : (
          items.map((tx) => <TransactionRow key={tx.id} tx={tx} showDate />)
        )}
      </div>
      {paying && <PayInvoiceModal card={card} invoice={invoice} onClose={() => setPaying(false)} />}
    </div>
  );
}

function PayInvoiceModal({ card, invoice, onClose }: { card: CardData; invoice: Invoice; onClose: () => void }) {
  const { accounts } = useAppData();
  const money = useMoney();
  const { run, loading } = useMutation();
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [date, setDate] = useState(toDateInput(new Date()));
  const selected = accounts.find((a) => a.id === accountId);

  return (
    <Modal
      open
      onClose={onClose}
      title="Pagar fatura"
      description={`${card.name} · ${invoice.label}`}
      size="sm"
      footer={<Button className="w-full" loading={loading} onClick={async () => { const r = await run(() => api.post(`/cards/${card.id}/pay`, { accountId, invoiceKey: invoice.key, date }), { success: "✅ Fatura paga!", successDescription: `${money(invoice.unpaid)} debitados de ${selected?.name}` }); if (r) onClose(); }}>Confirmar pagamento de {money(invoice.unpaid)}</Button>}
    >
      <div className="space-y-4">
        <Field label="Pagar com a conta" hint={selected ? `Saldo atual: ${money(selected.balance)}` : undefined}>
          <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
        </Field>
        <Field label="Data do pagamento"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <p className="rounded-xl bg-brand-soft px-3.5 py-2.5 text-xs text-brand">O pagamento da fatura não conta como uma nova despesa — os gastos já foram registrados em cada compra.</p>
      </div>
    </Modal>
  );
}

export function CardsView({ cards, purchases }: { cards: CardData[]; purchases: Purchase[] }) {
  const money = useMoney();
  const [editing, setEditing] = useState<CardData | "new" | null>(null);
  const [selectedId, setSelectedId] = useState(cards[0]?.id);
  const card = cards.find((c) => c.id === selectedId) ?? cards[0];

  return (
    <div>
      <PageHeader title="Cartões de crédito" description="Faturas, limites e compras parceladas." action={<Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Novo cartão</Button>} />

      {!card ? (
        <Card><EmptyState icon={<CreditCard className="h-6 w-6" />} title="Nenhum cartão cadastrado" description="Cadastre seus cartões para acompanhar faturas, limite e parcelamentos." action={<Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Adicionar cartão</Button>} /></Card>
      ) : (
        <div className="space-y-6">
          {cards.length > 1 && (
            <div className="no-scrollbar flex gap-2 overflow-x-auto">
              {cards.map((c) => (
                <button key={c.id} onClick={() => setSelectedId(c.id)} className={cn("flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors", c.id === card.id ? "border-brand bg-brand-soft text-brand" : "border-border hover:bg-subtle")}>
                  <span className="h-3 w-5 rounded-sm" style={{ background: c.color }} />{c.name}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
            <div className="min-w-0 space-y-4">
              <CardVisual card={card} onEdit={() => setEditing(card)} />
              <Card className="p-5">
                <div className="mb-2 flex justify-between text-[13px]">
                  <span className="text-muted">Limite utilizado</span>
                  <span className="tabular font-medium">{money(card.used)} de {money(card.limit)}</span>
                </div>
                <Progress value={card.utilization} tone={card.utilization >= 90 ? "exceeded" : card.utilization >= 75 ? "warning" : "ok"} />
                {card.utilization >= 80 && <p className="mt-2 text-xs font-medium text-warning">⚠️ Seu cartão está {Math.round(card.utilization)}% comprometido.</p>}
                <dl className="mt-4 grid grid-cols-2 gap-3">
                  {[
                    ["Fatura atual", card.currentInvoice.total],
                    ["Próxima fatura", card.nextInvoice.total],
                    ["Total parcelado", card.totalInstallments],
                    ["Limite disponível", card.available],
                  ].map(([label, v]) => (
                    <div key={label as string} className="rounded-xl bg-subtle p-3">
                      <dt className="text-[11px] text-muted">{label}</dt>
                      <dd className="tabular mt-0.5 text-[15px] font-semibold">{money(v as number)}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 text-xs text-muted">Fecha dia {card.closingDay} · vence dia {card.dueDay}</p>
              </Card>
            </div>
            <Card className="min-w-0 p-5">
              <h2 className="mb-3 text-[15px] font-semibold">Faturas</h2>
              <InvoicePanel key={card.id} card={card} />
            </Card>
          </div>

          <Card>
            <CardHeader title="Compras parceladas" description={purchases.length ? `${money(purchases.reduce((s, p) => s + p.remaining, 0))} ainda a pagar` : undefined} />
            <div className="p-5">
              {purchases.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted">Nenhuma compra parcelada em aberto. 👏</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {purchases.map((p) => (
                    <div key={p.id} className="rounded-xl border border-border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{p.category?.icon} {p.description}</p>
                          <p className="text-xs text-muted">{p.card.name} · comprado em {formatDateShort(p.purchaseDate)}</p>
                        </div>
                        <p className="tabular shrink-0 font-semibold">{money(p.totalAmount)}</p>
                      </div>
                      <p className="mt-2 text-[13px] text-muted">{p.installments}x de <b className="tabular text-foreground">{money(p.installmentAmount)}</b></p>
                      <div className="mt-3 flex items-center gap-3">
                        <Progress value={(p.currentInstallment / p.installments) * 100} color={p.card.color} className="h-1.5" />
                        <span className="shrink-0 text-xs font-medium">Parcela {p.currentInstallment} de {p.installments}</span>
                      </div>
                      <p className="mt-2 text-[11px] text-muted">Restam {money(p.remaining)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {editing && <CardForm card={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function CardForm({ card, onClose }: { card: CardData | null; onClose: () => void }) {
  const { user } = useAppData();
  const confirm = useConfirm();
  const { run, loading, errors } = useMutation();
  const [form, setForm] = useState({
    name: card?.name ?? "",
    bank: card?.bank ?? "",
    brand: card?.brand ?? "mastercard",
    limit: card?.limit ?? 0,
    closingDay: card?.closingDay ?? 5,
    dueDay: card?.dueDay ?? 12,
    color: card?.color ?? "#18181b",
  });
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  const save = async () => {
    const r = await run(() => (card ? api.patch(`/cards/${card.id}`, form) : api.post("/cards", form)), { success: card ? "Cartão atualizado" : "💳 Cartão adicionado!" });
    if (r !== undefined) onClose();
  };
  const remove = async () => {
    if (!card || !(await confirm({ title: `Excluir ${card.name}?`, description: "Cartões com faturas em aberto são arquivados.", confirmLabel: "Excluir", danger: true }))) return;
    if (await run(() => api.delete(`/cards/${card.id}`), { success: "Cartão removido" })) onClose();
  };

  return (
    <Modal open onClose={onClose} title={card ? "Editar cartão" : "Novo cartão"} footer={<>{card && <Button variant="danger-ghost" onClick={remove}>Excluir</Button>}<Button className="flex-1" loading={loading} onClick={save}>Salvar</Button></>}>
      <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nome do cartão" error={errors.name}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Nubank" autoFocus /></Field>
          <Field label="Banco" error={errors.bank}><Input value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })} placeholder="Ex.: Nubank" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Limite total" error={errors.limit}><MoneyInput value={form.limit} onChange={(v) => setForm({ ...form, limit: v })} currency={user.currency} /></Field>
          <Field label="Bandeira">
            <Select value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })}>
              {CARD_BRANDS.map((b) => <option key={b} value={b}>{b[0].toUpperCase() + b.slice(1)}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Dia de fechamento"><Select value={form.closingDay} onChange={(e) => setForm({ ...form, closingDay: Number(e.target.value) })}>{days.map((d) => <option key={d} value={d}>Dia {d}</option>)}</Select></Field>
          <Field label="Dia de vencimento"><Select value={form.dueDay} onChange={(e) => setForm({ ...form, dueDay: Number(e.target.value) })}>{days.map((d) => <option key={d} value={d}>Dia {d}</option>)}</Select></Field>
        </div>
        <p className="text-xs text-muted">O limite disponível é calculado automaticamente a partir das compras em aberto.</p>
        <Field label="Cor"><ColorPicker value={form.color} onChange={(c) => setForm({ ...form, color: c })} colors={["#18181b", "#6d28d9", "#1d4ed8", "#0f766e", "#b91c1c", "#c2410c", "#a16207", "#be185d", "#334155"]} /></Field>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}
