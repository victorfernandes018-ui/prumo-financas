"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Check, List, MoreHorizontal, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { MoneyInput } from "@/components/ui/money-input";
import { Badge, EmptyState, IconBubble, PageHeader, Segmented, Switch } from "@/components/ui/misc";
import { useConfirm } from "@/components/ui/confirm";
import { useAppData, useMoney } from "@/components/providers/app-data";
import { api } from "@/lib/api-client";
import { daysInMonth, formatDateShort, MONTHS_PT, WEEKDAYS_SHORT_PT } from "@/lib/dates";
import { useMutation } from "@/lib/use-mutation";
import { cn } from "@/lib/utils";
import type { RecurringStatus } from "@/server/services/recurring";

const SUGGESTIONS = ["Aluguel", "Internet", "Netflix", "Spotify", "Academia", "Energia", "Água", "Telefone", "Financiamento"];

function statusOf(r: RecurringStatus) {
  if (!r.active) return { label: "Inativa", tone: "neutral" as const };
  if (!r.dueThisMonth) return { label: "Anual", tone: "neutral" as const };
  if (r.paidThisMonth) return { label: "Paga", tone: "income" as const };
  if (r.overdue) return { label: "Atrasada", tone: "expense" as const };
  if (r.daysUntilDue <= 3) return { label: r.daysUntilDue === 0 ? "Vence hoje" : r.daysUntilDue === 1 ? "Vence amanhã" : `Em ${r.daysUntilDue} dias`, tone: "warning" as const };
  return { label: `Dia ${r.dueDay}`, tone: "brand" as const };
}

export function RecurringView({ items }: { items: RecurringStatus[] }) {
  const money = useMoney();
  const { run } = useMutation();
  const [view, setView] = useState<"list" | "calendar">("list");
  const [editing, setEditing] = useState<RecurringStatus | "new" | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  const active = items.filter((i) => i.active);
  const monthly = active.reduce((s, r) => s + (r.recurrence === "YEARLY" ? Math.round(r.amount / 12) : r.amount), 0);
  const paid = active.filter((r) => r.dueThisMonth && r.paidThisMonth).reduce((s, r) => s + r.amount, 0);
  const pending = active.filter((r) => r.dueThisMonth && !r.paidThisMonth).reduce((s, r) => s + r.amount, 0);

  const pay = async (r: RecurringStatus) => {
    setPayingId(r.id);
    await run(() => api.post(`/recurring/${r.id}/pay`, {}), { success: `✅ ${r.name} paga!`, successDescription: `${money(r.amount)} registrado como despesa` });
    setPayingId(null);
  };

  return (
    <div>
      <PageHeader title="Contas recorrentes" description="Suas contas fixas e o calendário de vencimentos." action={<Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Nova conta</Button>} />

      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { label: "Custo mensal fixo", value: monthly, cls: "" },
          { label: "Já pago este mês", value: paid, cls: "text-income" },
          { label: "A pagar este mês", value: pending, cls: pending ? "text-warning" : "" },
        ].map((s) => (
          <Card key={s.label} className="p-3 sm:p-4">
            <p className="text-[11px] font-medium text-muted sm:text-xs">{s.label}</p>
            <p className={cn("tabular mt-1 text-[13px] leading-tight font-semibold min-[400px]:text-base sm:text-xl", s.cls)}>{money(s.value)}</p>
          </Card>
        ))}
      </div>

      {items.length === 0 ? (
        <Card><EmptyState icon="📅" title="Nenhuma conta recorrente" description="Cadastre aluguel, internet, assinaturas e outras contas fixas para nunca perder um vencimento." action={<Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Adicionar conta</Button>} /></Card>
      ) : (
        <Card>
          <CardHeader
            title={view === "list" ? "Todas as contas" : `Vencimentos de ${MONTHS_PT[new Date().getMonth()]}`}
            action={<Segmented size="sm" value={view} onChange={setView} options={[{ value: "list", label: <span className="flex items-center gap-1"><List className="h-3.5 w-3.5" />Lista</span> }, { value: "calendar", label: <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />Calendário</span> }]} />}
          />
          <div className="p-3 sm:p-5">
            {view === "list" ? (
              <ul className="divide-y divide-border">
                {items.map((r) => {
                  const st = statusOf(r);
                  return (
                    <li key={r.id} className={cn("flex items-center gap-3 px-2 py-3", !r.active && "opacity-50")}>
                      <IconBubble icon={r.category?.icon ?? "📅"} color={r.category?.color ?? "#94a3b8"} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{r.name}</p>
                        <p className="text-xs text-muted">{r.recurrence === "YEARLY" ? `Anual · ${r.dueDay}/${String(r.dueMonth).padStart(2, "0")}` : `Todo dia ${r.dueDay}`} · próx. {formatDateShort(r.nextDue)}</p>
                      </div>
                      <Badge tone={st.tone} className="hidden sm:inline-flex">{st.label}</Badge>
                      <span className="tabular w-24 text-right text-sm font-semibold">{money(r.amount)}</span>
                      {r.active && r.dueThisMonth && !r.paidThisMonth ? (
                        <Button size="sm" variant="outline" loading={payingId === r.id} onClick={() => pay(r)}><Check className="h-3.5 w-3.5" /><span className="hidden sm:inline">Pagar</span></Button>
                      ) : (
                        <span className="w-[34px] sm:w-[78px]" />
                      )}
                      <button onClick={() => setEditing(r)} className="rounded-lg p-1.5 text-muted hover:bg-subtle" aria-label={`Editar ${r.name}`}><MoreHorizontal className="h-4 w-4" /></button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <BillsCalendar items={active} />
            )}
          </div>
        </Card>
      )}

      {editing && <RecurringForm item={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function BillsCalendar({ items }: { items: RecurringStatus[] }) {
  const money = useMoney();
  const now = new Date();
  const [selected, setSelected] = useState<number | null>(null);
  const total = daysInMonth(now.getFullYear(), now.getMonth());
  const offset = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
  const byDay = useMemo(() => {
    const map = new Map<number, RecurringStatus[]>();
    for (const r of items.filter((i) => i.dueThisMonth)) {
      const d = Math.min(r.dueDay, total);
      map.set(d, [...(map.get(d) ?? []), r]);
    }
    return map;
  }, [items, total]);
  const dayItems = selected ? byDay.get(selected) ?? [] : [];

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS_SHORT_PT.map((w) => <div key={w} className="pb-2 text-[11px] font-medium text-muted uppercase">{w}</div>)}
        {Array.from({ length: offset }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: total }, (_, i) => i + 1).map((d) => {
          const bills = byDay.get(d) ?? [];
          const isToday = d === now.getDate();
          const allPaid = bills.length > 0 && bills.every((b) => b.paidThisMonth);
          const late = bills.some((b) => b.overdue);
          return (
            <button
              key={d}
              onClick={() => setSelected(d === selected ? null : d)}
              className={cn(
                "relative flex aspect-square flex-col items-center justify-start rounded-xl p-1 text-xs transition-colors sm:aspect-[1.3] sm:p-1.5",
                bills.length ? "bg-subtle hover:bg-border/60" : "hover:bg-subtle",
                selected === d && "ring-2 ring-brand",
                isToday && "font-bold text-brand",
              )}
            >
              <span>{d}</span>
              {bills.length > 0 && (
                <span className="mt-auto flex flex-wrap justify-center gap-0.5">
                  {bills.slice(0, 3).map((b) => <span key={b.id} className="text-[11px] leading-none sm:text-sm">{b.category?.icon ?? "📅"}</span>)}
                </span>
              )}
              {bills.length > 0 && <span className={cn("absolute top-1 right-1 h-1.5 w-1.5 rounded-full", allPaid ? "bg-income" : late ? "bg-expense" : "bg-warning")} aria-hidden />}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-muted">
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-income" /> Paga</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-warning" /> A vencer</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-expense" /> Atrasada</span>
      </div>
      {selected && (
        <div className="mt-4 animate-fade-in rounded-xl border border-border p-3">
          <p className="mb-2 text-sm font-semibold">Dia {selected}</p>
          {dayItems.length ? dayItems.map((b) => (
            <div key={b.id} className="flex items-center justify-between py-1.5 text-sm">
              <span>{b.category?.icon} {b.name}</span>
              <span className="flex items-center gap-2"><Badge tone={statusOf(b).tone}>{statusOf(b).label}</Badge><b className="tabular">{money(b.amount)}</b></span>
            </div>
          )) : <p className="text-sm text-muted">Nenhum vencimento neste dia.</p>}
        </div>
      )}
    </div>
  );
}

function RecurringForm({ item, onClose }: { item: RecurringStatus | null; onClose: () => void }) {
  const { categories, accounts, user } = useAppData();
  const confirm = useConfirm();
  const { run, loading, errors } = useMutation();
  const expenseCats = categories.filter((c) => c.type === "EXPENSE");
  const [form, setForm] = useState({
    name: item?.name ?? "",
    amount: item?.amount ?? 0,
    categoryId: item?.categoryId ?? expenseCats.find((c) => c.name === "Contas")?.id ?? "",
    accountId: item?.accountId ?? accounts[0]?.id ?? "",
    dueDay: item?.dueDay ?? 10,
    dueMonth: item?.dueMonth ?? new Date().getMonth() + 1,
    recurrence: item?.recurrence ?? "MONTHLY",
    active: item?.active ?? true,
  });

  const save = async () => {
    const payload = { ...form, categoryId: form.categoryId || null, accountId: form.accountId || null, dueMonth: form.recurrence === "YEARLY" ? form.dueMonth : null };
    const r = await run(() => (item ? api.patch(`/recurring/${item.id}`, payload) : api.post("/recurring", payload)), { success: item ? "Conta atualizada" : "📅 Conta recorrente criada!" });
    if (r !== undefined) onClose();
  };
  const remove = async () => {
    if (!item || !(await confirm({ title: `Excluir ${item.name}?`, description: "Os pagamentos já registrados continuam no histórico.", confirmLabel: "Excluir", danger: true }))) return;
    if (await run(() => api.delete(`/recurring/${item.id}`), { success: "Conta removida" })) onClose();
  };

  return (
    <Modal open onClose={onClose} title={item ? "Editar conta recorrente" : "Nova conta recorrente"} footer={<>{item && <Button variant="danger-ghost" onClick={remove}>Excluir</Button>}<Button className="flex-1" loading={loading} onClick={save}>Salvar</Button></>}>
      <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-4">
        <Field label="Nome" error={errors.name}>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Internet" autoFocus list="recurring-suggestions" />
          <datalist id="recurring-suggestions">{SUGGESTIONS.map((s) => <option key={s} value={s} />)}</datalist>
        </Field>
        {!item && (
          <div className="no-scrollbar -mt-2 flex gap-1.5 overflow-x-auto">
            {SUGGESTIONS.map((s) => <button key={s} type="button" onClick={() => setForm({ ...form, name: s })} className="shrink-0 rounded-full bg-subtle px-2.5 py-1 text-xs text-muted hover:text-foreground">{s}</button>)}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor" error={errors.amount}><MoneyInput value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} currency={user.currency} /></Field>
          <Field label="Categoria">
            <Select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              {expenseCats.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Recorrência">
            <Select value={form.recurrence} onChange={(e) => setForm({ ...form, recurrence: e.target.value })}>
              <option value="MONTHLY">Mensal</option>
              <option value="YEARLY">Anual</option>
            </Select>
          </Field>
          <Field label="Vencimento">
            <div className="flex gap-2">
              <Select value={form.dueDay} onChange={(e) => setForm({ ...form, dueDay: Number(e.target.value) })}>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>Dia {d}</option>)}
              </Select>
              {form.recurrence === "YEARLY" && (
                <Select value={form.dueMonth} onChange={(e) => setForm({ ...form, dueMonth: Number(e.target.value) })}>
                  {MONTHS_PT.map((m, i) => <option key={m} value={i + 1}>{m.slice(0, 3)}</option>)}
                </Select>
              )}
            </div>
          </Field>
        </div>
        <Field label="Pagar com a conta">
          <Select value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })}>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
        </Field>
        <label className="flex items-center justify-between rounded-xl bg-subtle px-3.5 py-3">
          <span className="text-sm">Conta ativa</span>
          <Switch checked={form.active} onChange={(v) => setForm({ ...form, active: v })} label="Conta ativa" />
        </label>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}
