"use client";

import { useState } from "react";
import { ArrowLeftRight, Banknote, Landmark, LineChart, MoreHorizontal, PiggyBank, Plus, Smartphone, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ColorPicker } from "@/components/ui/color-picker";
import { Field, Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { MoneyInput } from "@/components/ui/money-input";
import { EmptyState, PageHeader, Switch } from "@/components/ui/misc";
import { useConfirm } from "@/components/ui/confirm";
import { useAppData, useMoney } from "@/components/providers/app-data";
import { useQuickActions } from "@/components/features/transactions/transaction-modal";
import { api } from "@/lib/api-client";
import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPES, type AccountType } from "@/lib/constants";
import { useMutation } from "@/lib/use-mutation";
import { cn } from "@/lib/utils";

interface AccountView {
  id: string; name: string; type: string; institution: string | null; color: string;
  initialBalance: number; includeInTotal: boolean; archived: boolean; balance: number;
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  CHECKING: Landmark, SAVINGS: PiggyBank, CASH: Banknote, WALLET: Smartphone, INVESTMENT: LineChart, OTHER: Wallet,
};

export function AccountsView({ accounts }: { accounts: AccountView[] }) {
  const money = useMoney();
  const { openNew } = useQuickActions();
  const [editing, setEditing] = useState<AccountView | "new" | null>(null);
  const active = accounts.filter((a) => !a.archived);
  const archived = accounts.filter((a) => a.archived);
  const total = active.filter((a) => a.includeInTotal).reduce((s, a) => s + a.balance, 0);
  const byType = ACCOUNT_TYPES.map((t) => ({ type: t, total: active.filter((a) => a.type === t).reduce((s, a) => s + a.balance, 0) })).filter((t) => t.total !== 0);

  return (
    <div>
      <PageHeader
        title="Contas"
        description="Saldo individual de cada conta e o total consolidado."
        action={
          <>
            <Button variant="outline" onClick={() => openNew("TRANSFER")} disabled={active.length < 2}><ArrowLeftRight className="h-4 w-4" /> <span className="hidden sm:inline">Transferir</span></Button>
            <Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Nova conta</Button>
          </>
        }
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl bg-gradient-to-br from-[#5b5cf0] to-[#4338ca] p-6 text-white shadow-lg shadow-brand/20">
          <p className="text-sm text-white/75">Saldo total</p>
          <p className="tabular mt-2 text-3xl font-semibold tracking-tight">{money(total)}</p>
          <p className="mt-2 text-xs text-white/70">{active.length} {active.length === 1 ? "conta ativa" : "contas ativas"}</p>
        </div>
        <Card className="p-5 lg:col-span-2">
          <p className="mb-3 text-sm font-semibold">Distribuição por tipo</p>
          <div className="flex h-3 overflow-hidden rounded-full bg-subtle">
            {byType.filter((t) => t.total > 0).map((t, i) => (
              <div key={t.type} style={{ width: `${(t.total / Math.max(total, 1)) * 100}%`, background: ["#2a78d6", "#0d9488", "#eb6834", "#e87ba4", "#4a3aa7", "#eda100"][i % 6] }} className="h-full border-r-2 border-card last:border-0" />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            {byType.filter((t) => t.total > 0).map((t, i) => (
              <span key={t.type} className="flex items-center gap-1.5 text-xs text-muted">
                <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: ["#2a78d6", "#0d9488", "#eb6834", "#e87ba4", "#4a3aa7", "#eda100"][i % 6] }} />
                {ACCOUNT_TYPE_LABELS[t.type as AccountType]} <b className="tabular text-foreground">{money(t.total)}</b>
              </span>
            ))}
          </div>
        </Card>
      </div>

      {active.length === 0 ? (
        <Card><EmptyState icon="🏦" title="Nenhuma conta cadastrada" description="Cadastre sua conta corrente, poupança, carteira ou investimentos." action={<Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Adicionar conta</Button>} /></Card>
      ) : (
        <div className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((a) => {
            const Icon = TYPE_ICONS[a.type] ?? Wallet;
            return (
              <Card key={a.id} className="group p-5 transition-shadow hover:shadow-pop">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl text-white" style={{ background: a.color }}><Icon className="h-5 w-5" /></div>
                    <div>
                      <p className="font-semibold">{a.name}</p>
                      <p className="text-xs text-muted">{ACCOUNT_TYPE_LABELS[a.type as AccountType]}{a.institution ? ` · ${a.institution}` : ""}</p>
                    </div>
                  </div>
                  <button onClick={() => setEditing(a)} className="rounded-lg p-1.5 text-muted hover:bg-subtle hover:text-foreground" aria-label={`Editar ${a.name}`}><MoreHorizontal className="h-4 w-4" /></button>
                </div>
                <p className={cn("tabular mt-5 text-2xl font-semibold tracking-tight", a.balance < 0 && "text-expense")}>{money(a.balance)}</p>
                {!a.includeInTotal && <p className="mt-1 text-[11px] text-muted">Não soma no saldo total</p>}
              </Card>
            );
          })}
        </div>
      )}

      {archived.length > 0 && (
        <div className="mt-8">
          <p className="mb-2 text-sm font-medium text-muted">Arquivadas</p>
          <div className="flex flex-wrap gap-2">
            {archived.map((a) => (
              <button key={a.id} onClick={() => setEditing(a)} className="rounded-full border border-border px-3 py-1.5 text-xs text-muted hover:bg-subtle">{a.name} · {money(a.balance)}</button>
            ))}
          </div>
        </div>
      )}

      {editing && <AccountForm account={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function AccountForm({ account, onClose }: { account: AccountView | null; onClose: () => void }) {
  const { user } = useAppData();
  const confirm = useConfirm();
  const { run, loading, errors } = useMutation();
  const [form, setForm] = useState({
    name: account?.name ?? "",
    type: account?.type ?? "CHECKING",
    institution: account?.institution ?? "",
    color: account?.color ?? "#6366f1",
    initialBalance: account?.initialBalance ?? 0,
    includeInTotal: account?.includeInTotal ?? true,
  });

  const save = async () => {
    const payload = { ...form, institution: form.institution || null };
    const ok = await run(() => (account ? api.patch(`/accounts/${account.id}`, { ...payload, archived: false }) : api.post("/accounts", payload)), { success: account ? "Conta atualizada" : "🏦 Conta criada!" });
    if (ok !== undefined) onClose();
  };

  const remove = async () => {
    if (!account) return;
    if (!(await confirm({ title: `Excluir ${account.name}?`, description: "Contas com movimentações são arquivadas para preservar seu histórico.", confirmLabel: "Excluir", danger: true }))) return;
    const res = await run(() => api.delete<{ archived: boolean }>(`/accounts/${account.id}`));
    if (res) onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={account ? "Editar conta" : "Nova conta"}
      footer={
        <>
          {account && <Button variant="danger-ghost" onClick={remove}>Excluir</Button>}
          <Button className="flex-1" loading={loading} onClick={save}>{account?.archived ? "Reativar e salvar" : "Salvar"}</Button>
        </>
      }
    >
      <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-4">
        <Field label="Nome" error={errors.name}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Nubank, Itaú, Carteira" autoFocus /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo">
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{ACCOUNT_TYPE_LABELS[t]}</option>)}
            </Select>
          </Field>
          <Field label="Instituição"><Input value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} placeholder="Opcional" /></Field>
        </div>
        <Field label="Saldo inicial" hint="Quanto havia na conta quando você começou a usar o Prumo." error={errors.initialBalance}>
          <MoneyInput value={form.initialBalance} onChange={(v) => setForm({ ...form, initialBalance: v })} currency={user.currency} allowNegative />
        </Field>
        <Field label="Cor"><ColorPicker value={form.color} onChange={(c) => setForm({ ...form, color: c })} /></Field>
        <label className="flex items-center justify-between rounded-xl bg-subtle px-3.5 py-3">
          <span className="text-sm">Somar no saldo total</span>
          <Switch checked={form.includeInTotal} onChange={(v) => setForm({ ...form, includeInTotal: v })} label="Somar no saldo total" />
        </label>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}
