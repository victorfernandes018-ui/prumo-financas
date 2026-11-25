"use client";

import { useState } from "react";
import { CalendarDays, MoreHorizontal, Plus, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ColorPicker } from "@/components/ui/color-picker";
import { Field, Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { MoneyInput } from "@/components/ui/money-input";
import { Badge, EmptyState, PageHeader, Segmented } from "@/components/ui/misc";
import { useConfirm } from "@/components/ui/confirm";
import { useAppData, useMoney } from "@/components/providers/app-data";
import { api } from "@/lib/api-client";
import { GOAL_TEMPLATES } from "@/lib/constants";
import { formatDateLong, toDateInput } from "@/lib/dates";
import { useMutation } from "@/lib/use-mutation";
import { cn } from "@/lib/utils";

interface GoalView {
  id: string; name: string; icon: string; color: string; targetAmount: number; currentAmount: number;
  deadline: string | null; completedAt: string | null;
  contributions: { id: string; amount: number; note: string | null; createdAt: string }[];
}

const ICONS = ["🎯", "🚗", "🛟", "✈️", "💍", "🏡", "📈", "💻", "🎓", "📱", "🏖️", "👶", "🐶", "🎸"];

function ProgressRing({ value, color, size = 84 }: { value: number; color: string; size?: number }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(Math.max(value, 0), 100);
  return (
    <svg width={size} height={size} className="-rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--subtle)" strokeWidth={8} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c} style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.22,1,0.36,1)" }} />
    </svg>
  );
}

/** Confete leve em CSS para celebrar metas concluídas. */
function Celebration({ goal, onClose }: { goal: GoalView; onClose: () => void }) {
  const money = useMoney();
  const pieces = Array.from({ length: 28 }, (_, i) => i);
  return (
    <Modal open onClose={onClose} size="sm" hideClose>
      <div className="relative overflow-hidden py-6 text-center">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {pieces.map((i) => (
            <span
              key={i}
              className="absolute top-0 text-lg"
              style={{ left: `${(i * 37) % 100}%`, animation: `confetti-fall ${1.6 + (i % 5) * 0.3}s ease-in ${(i % 7) * 0.08}s both` }}
            >
              {["🎉", "✨", "🎊", "💰", "⭐"][i % 5]}
            </span>
          ))}
        </div>
        <div className="mx-auto flex h-20 w-20 animate-pop items-center justify-center rounded-3xl text-4xl" style={{ background: `color-mix(in srgb, ${goal.color} 16%, transparent)` }}>{goal.icon}</div>
        <h2 className="mt-5 text-xl font-semibold">🎉 Parabéns! Você atingiu sua meta.</h2>
        <p className="mt-2 text-sm text-muted">“{goal.name}” está completa com {money(goal.targetAmount)} guardados. Que conquista!</p>
        <Button className="mt-6" onClick={onClose}>Continuar</Button>
      </div>
      <style>{`@keyframes confetti-fall { from { transform: translateY(-20px) rotate(0); opacity: 1 } to { transform: translateY(320px) rotate(540deg); opacity: 0 } }`}</style>
    </Modal>
  );
}

export function GoalsView({ goals }: { goals: GoalView[] }) {
  const money = useMoney();
  const [editing, setEditing] = useState<GoalView | "new" | null>(null);
  const [contributing, setContributing] = useState<GoalView | null>(null);
  const [celebrate, setCelebrate] = useState<GoalView | null>(null);
  const [tab, setTab] = useState<"active" | "done">("active");

  const active = goals.filter((g) => !g.completedAt);
  const done = goals.filter((g) => g.completedAt);
  const saved = goals.reduce((s, g) => s + g.currentAmount, 0);
  const target = active.reduce((s, g) => s + g.targetAmount, 0);
  const list = tab === "active" ? active : done;

  return (
    <div>
      <PageHeader title="Minhas metas" description="Transforme sonhos em planos com progresso visível." action={<Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Nova meta</Button>} />

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Card className="p-3 sm:p-4"><p className="text-xs text-muted">Total guardado</p><p className="tabular mt-1 text-[13px] leading-tight font-semibold min-[400px]:text-base sm:text-xl">{money(saved)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted">Metas ativas</p><p className="mt-1 text-base font-semibold sm:text-xl">{active.length}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted">Concluídas</p><p className="mt-1 flex items-center gap-1 text-base font-semibold sm:text-xl"><Trophy className="h-4 w-4 text-warning" />{done.length}</p></Card>
      </div>

      {goals.length > 0 && (
        <Segmented className="mb-4" value={tab} onChange={setTab} options={[{ value: "active", label: `Em andamento (${active.length})` }, { value: "done", label: `Concluídas (${done.length})` }]} />
      )}

      {goals.length === 0 ? (
        <Card>
          <EmptyState icon="🎯" title="Qual é o seu próximo sonho?" description="Crie uma meta — reserva de emergência, viagem, carro — e acompanhe cada passo até chegar lá." action={<Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Criar minha primeira meta</Button>} />
        </Card>
      ) : list.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted">{tab === "done" ? "Nenhuma meta concluída ainda — você chega lá! 💪" : "Todas as metas foram concluídas! 🎉"}</p>
      ) : (
        <div className="stagger grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((g) => {
            const pct = (g.currentAmount / g.targetAmount) * 100;
            const missing = Math.max(g.targetAmount - g.currentAmount, 0);
            const months = g.deadline ? Math.max(1, Math.ceil((new Date(g.deadline).getTime() - Date.now()) / (30.4 * 86_400_000))) : null;
            return (
              <Card key={g.id} className="flex flex-col p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl" style={{ background: `color-mix(in srgb, ${g.color} 14%, transparent)` }}>{g.icon}</div>
                    <div>
                      <p className="font-semibold">{g.name}</p>
                      {g.deadline && <p className="flex items-center gap-1 text-xs text-muted"><CalendarDays className="h-3 w-3" /> até {formatDateLong(g.deadline)}</p>}
                    </div>
                  </div>
                  <button onClick={() => setEditing(g)} className="rounded-lg p-1.5 text-muted hover:bg-subtle" aria-label={`Editar ${g.name}`}><MoreHorizontal className="h-4 w-4" /></button>
                </div>
                <div className="my-5 flex items-center gap-5">
                  <div className="relative">
                    <ProgressRing value={pct} color={g.color} />
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{Math.floor(Math.min(pct, 100))}%</span>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <p><span className="text-muted">Atual</span><br /><b className="tabular text-base">{money(g.currentAmount)}</b></p>
                    <p><span className="text-muted">Meta</span> <b className="tabular">{money(g.targetAmount)}</b></p>
                  </div>
                </div>
                {g.completedAt ? (
                  <Badge tone="income" className="self-start">🏆 Concluída</Badge>
                ) : (
                  <p className="text-xs text-muted">
                    Faltam <b className="tabular text-foreground">{money(missing)}</b>
                    {months ? <> · guarde <b className="tabular text-foreground">{money(Math.ceil(missing / months))}/mês</b> para chegar no prazo</> : null}
                  </p>
                )}
                {!g.completedAt && (
                  <Button className="mt-4 w-full" variant="secondary" onClick={() => setContributing(g)}><Plus className="h-4 w-4" /> Adicionar dinheiro</Button>
                )}
              </Card>
            );
          })}
        </div>
      )}
      {target > 0 && tab === "active" && <p className="mt-6 text-center text-xs text-muted">Você já guardou {Math.round((active.reduce((s, g) => s + g.currentAmount, 0) / target) * 100)}% do total das suas metas ativas.</p>}

      {editing && <GoalForm goal={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      {contributing && (
        <ContributeModal
          goal={contributing}
          onClose={() => setContributing(null)}
          onCompleted={(g) => {
            setContributing(null);
            setCelebrate(g);
          }}
        />
      )}
      {celebrate && <Celebration goal={celebrate} onClose={() => setCelebrate(null)} />}
    </div>
  );
}

function ContributeModal({ goal, onClose, onCompleted }: { goal: GoalView; onClose: () => void; onCompleted: (g: GoalView) => void }) {
  const { user } = useAppData();
  const money = useMoney();
  const { run, loading, errors } = useMutation();
  const [mode, setMode] = useState<"add" | "withdraw">("add");
  const [amount, setAmount] = useState(0);
  const missing = goal.targetAmount - goal.currentAmount;
  const quick = [5000, 10000, 50000, missing].filter((v, i, a) => v > 0 && a.indexOf(v) === i);

  const save = async () => {
    const r = await run(() => api.post<{ justCompleted: boolean }>(`/goals/${goal.id}/contribute`, { amount: mode === "add" ? amount : -amount }), {
      success: mode === "add" ? "💰 Dinheiro adicionado à meta!" : "Resgate registrado",
      successDescription: `${money(amount)} · ${goal.name}`,
    });
    if (!r) return;
    if (r.justCompleted) onCompleted({ ...goal, currentAmount: goal.currentAmount + amount });
    else onClose();
  };

  return (
    <Modal open onClose={onClose} title={`${goal.icon} ${goal.name}`} description={`${money(goal.currentAmount)} de ${money(goal.targetAmount)}`} size="sm" footer={<Button className="w-full" loading={loading} onClick={save} disabled={amount <= 0}>{mode === "add" ? "Adicionar" : "Resgatar"} {amount > 0 ? money(amount) : ""}</Button>}>
      <div className="space-y-5">
        <Segmented className="w-full" value={mode} onChange={setMode} options={[{ value: "add", label: "Adicionar" }, { value: "withdraw", label: "Resgatar" }]} />
        <MoneyInput size="hero" value={amount} onChange={setAmount} currency={user.currency} autoFocus invalid={!!errors.amount} />
        {mode === "add" && (
          <div className="flex flex-wrap justify-center gap-2">
            {quick.map((q) => (
              <button key={q} type="button" onClick={() => setAmount(q)} className={cn("rounded-full px-3 py-1.5 text-xs font-medium", amount === q ? "bg-foreground text-background" : "bg-subtle text-muted hover:text-foreground")}>
                {q === missing ? `Completar (${money(q)})` : `+ ${money(q)}`}
              </button>
            ))}
          </div>
        )}
        {goal.contributions.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-muted">Últimos aportes</p>
            <ul className="space-y-1">
              {goal.contributions.map((c) => (
                <li key={c.id} className="flex justify-between text-[13px]">
                  <span className="text-muted">{new Date(c.createdAt).toLocaleDateString("pt-BR")} · {c.note ?? "Aporte"}</span>
                  <span className={cn("tabular font-medium", c.amount < 0 ? "text-expense" : "text-income")}>{c.amount < 0 ? "−" : "+"} {money(Math.abs(c.amount))}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}

function GoalForm({ goal, onClose }: { goal: GoalView | null; onClose: () => void }) {
  const { user } = useAppData();
  const confirm = useConfirm();
  const { run, loading, errors } = useMutation();
  const [form, setForm] = useState({
    name: goal?.name ?? "",
    icon: goal?.icon ?? "🎯",
    color: goal?.color ?? "#6366f1",
    targetAmount: goal?.targetAmount ?? 0,
    currentAmount: goal?.currentAmount ?? 0,
    deadline: goal?.deadline ? toDateInput(new Date(goal.deadline)) : "",
  });

  const save = async () => {
    const payload = { ...form, deadline: form.deadline || null };
    const r = await run(() => (goal ? api.patch(`/goals/${goal.id}`, payload) : api.post("/goals", payload)), { success: goal ? "Meta atualizada" : "🎯 Meta criada! Vamos juntos." });
    if (r !== undefined) onClose();
  };
  const remove = async () => {
    if (!goal || !(await confirm({ title: `Excluir a meta "${goal.name}"?`, confirmLabel: "Excluir", danger: true }))) return;
    if (await run(() => api.delete(`/goals/${goal.id}`), { success: "Meta excluída" })) onClose();
  };

  return (
    <Modal open onClose={onClose} title={goal ? "Editar meta" : "Nova meta"} footer={<>{goal && <Button variant="danger-ghost" onClick={remove}>Excluir</Button>}<Button className="flex-1" loading={loading} onClick={save}>Salvar</Button></>}>
      <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-4">
        {!goal && (
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
            {GOAL_TEMPLATES.map((t) => (
              <button key={t.name} type="button" onClick={() => setForm({ ...form, name: t.name, icon: t.icon })} className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-subtle">{t.icon} {t.name}</button>
            ))}
          </div>
        )}
        <Field label="Nome da meta" error={errors.name}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Viagem para a Europa" autoFocus /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quanto quer juntar?" error={errors.targetAmount}><MoneyInput value={form.targetAmount} onChange={(v) => setForm({ ...form, targetAmount: v })} currency={user.currency} /></Field>
          <Field label={goal ? "Valor atual" : "Já tenho guardado"}><MoneyInput value={form.currentAmount} onChange={(v) => setForm({ ...form, currentAmount: v })} currency={user.currency} /></Field>
        </div>
        <Field label="Prazo (opcional)"><Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></Field>
        <Field label="Ícone">
          <div className="flex flex-wrap gap-1.5">
            {ICONS.map((i) => <button key={i} type="button" onClick={() => setForm({ ...form, icon: i })} className={cn("flex h-10 w-10 items-center justify-center rounded-xl text-xl transition", form.icon === i ? "bg-brand-soft ring-2 ring-brand" : "bg-subtle hover:bg-border")}>{i}</button>)}
          </div>
        </Field>
        <Field label="Cor"><ColorPicker value={form.color} onChange={(c) => setForm({ ...form, color: c })} /></Field>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}
