"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { MoneyInput } from "@/components/ui/money-input";
import { EmptyState, PageHeader, Progress } from "@/components/ui/misc";
import { useConfirm } from "@/components/ui/confirm";
import { useAppData, useMoney } from "@/components/providers/app-data";
import { api } from "@/lib/api-client";
import { MONTHS_PT } from "@/lib/dates";
import { useMutation } from "@/lib/use-mutation";
import { cn } from "@/lib/utils";
import type { BudgetStatus } from "@/server/services/budgets";

export function BudgetView({ budgets, spending }: { budgets: BudgetStatus[]; spending: { categoryId: string; amount: number }[] }) {
  const money = useMoney();
  const [editing, setEditing] = useState<BudgetStatus | "new" | null>(null);
  const planned = budgets.reduce((s, b) => s + b.amount, 0);
  const spent = budgets.reduce((s, b) => s + b.spent, 0);
  const pct = planned ? (spent / planned) * 100 : 0;
  const exceeded = budgets.filter((b) => b.status === "exceeded");

  return (
    <div>
      <PageHeader title="Meu orçamento" description={`Limites de gastos por categoria em ${MONTHS_PT[new Date().getMonth()]}.`} action={<Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Novo limite</Button>} />

      {budgets.length === 0 ? (
        <Card><EmptyState icon="🎯" title="Nenhum orçamento definido" description="Defina quanto quer gastar por categoria — por exemplo, Alimentação: R$ 800 — e acompanhe em tempo real." action={<Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Definir primeiro limite</Button>} /></Card>
      ) : (
        <>
          <Card className="mb-6 p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm text-muted">Total orçado</p>
                <p className="tabular text-2xl font-semibold tracking-tight">{money(spent)} <span className="text-base font-normal text-muted">/ {money(planned)}</span></p>
              </div>
              <p className={cn("text-sm font-medium", planned - spent >= 0 ? "text-income" : "text-expense")}>
                {planned - spent >= 0 ? `Restam ${money(planned - spent)}` : `${money(spent - planned)} acima do planejado`}
              </p>
            </div>
            <Progress value={pct} className="mt-4 h-3" tone={pct > 100 ? "exceeded" : pct >= 80 ? "warning" : "ok"} />
            {exceeded.length > 0 && <p className="mt-3 text-sm font-medium text-expense">🔴 Você ultrapassou o orçamento em {exceeded.map((e) => e.category.name).join(", ")}.</p>}
          </Card>

          <div className="stagger grid gap-3 md:grid-cols-2">
            {budgets.map((b) => (
              <Card key={b.id} className="p-5">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-2 font-semibold"><span className="text-xl">{b.category.icon}</span>{b.category.name}</p>
                  <button onClick={() => setEditing(b)} className="rounded-lg p-1.5 text-muted hover:bg-subtle" aria-label={`Editar orçamento de ${b.category.name}`}><Pencil className="h-4 w-4" /></button>
                </div>
                <div className="mt-4 flex items-end justify-between">
                  <p className="tabular text-sm"><b className={cn("text-lg", b.status === "exceeded" && "text-expense")}>{money(b.spent)}</b> <span className="text-muted">/ {money(b.amount)}</span></p>
                  <p className={cn("text-sm font-semibold", b.status === "exceeded" ? "text-expense" : b.status === "warning" ? "text-warning" : "text-muted")}>{Math.round(b.percent)}%</p>
                </div>
                <Progress value={b.percent} color={b.category.color} tone={b.status} className="mt-2" />
                <p className={cn("mt-2 text-xs", b.status === "exceeded" ? "font-medium text-expense" : "text-muted")}>
                  {b.status === "exceeded" ? "🔴 Você ultrapassou seu orçamento." : b.status === "warning" ? `🟡 Atenção: restam ${money(b.remaining)}` : `Restam ${money(b.remaining)}`}
                </p>
              </Card>
            ))}
          </div>
        </>
      )}
      {editing && <BudgetForm budget={editing === "new" ? null : editing} existing={budgets.map((b) => b.categoryId)} spending={spending} onClose={() => setEditing(null)} />}
    </div>
  );
}

function BudgetForm({ budget, existing, spending, onClose }: { budget: BudgetStatus | null; existing: string[]; spending: { categoryId: string; amount: number }[]; onClose: () => void }) {
  const { categories, user } = useAppData();
  const money = useMoney();
  const confirm = useConfirm();
  const { run, loading, errors } = useMutation();
  const options = categories.filter((c) => c.type === "EXPENSE" && (budget ? c.id === budget.categoryId : !existing.includes(c.id)));
  const [categoryId, setCategoryId] = useState(budget?.categoryId ?? options[0]?.id ?? "");
  const [amount, setAmount] = useState(budget?.amount ?? 0);
  const spentNow = spending.find((s) => s.categoryId === categoryId)?.amount ?? 0;

  const save = async () => {
    const r = await run(() => api.put("/budgets", { categoryId, amount }), { success: budget ? "Orçamento atualizado" : "🎯 Limite definido!" });
    if (r !== undefined) onClose();
  };
  const remove = async () => {
    if (!budget || !(await confirm({ title: "Remover este limite?", confirmLabel: "Remover", danger: true }))) return;
    if (await run(() => api.delete(`/budgets/${budget.id}`), { success: "Limite removido" })) onClose();
  };

  return (
    <Modal open onClose={onClose} title={budget ? `Orçamento de ${budget.category.name}` : "Novo limite de gastos"} size="sm" footer={<>{budget && <Button variant="danger-ghost" onClick={remove}>Remover</Button>}<Button className="flex-1" loading={loading} onClick={save} disabled={!categoryId}>Salvar</Button></>}>
      <div className="space-y-4">
        {!budget && (
          <Field label="Categoria" error={errors.categoryId}>
            {options.length ? (
              <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                {options.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </Select>
            ) : <p className="text-sm text-muted">Todas as categorias já têm orçamento.</p>}
          </Field>
        )}
        <Field label="Limite mensal" error={errors.amount} hint={`Gasto até agora neste mês: ${money(spentNow)}`}>
          <MoneyInput value={amount} onChange={setAmount} currency={user.currency} autoFocus />
        </Field>
      </div>
    </Modal>
  );
}
