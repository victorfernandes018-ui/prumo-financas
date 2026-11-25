"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, ChevronDown, Repeat, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { MoneyInput } from "@/components/ui/money-input";
import { Segmented } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import { useAppData, useMoney } from "@/components/providers/app-data";
import { api, ApiClientError } from "@/lib/api-client";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS, RECURRENCE_LABELS, RECURRENCES, type TransactionType } from "@/lib/constants";
import { addDays, toDateInput } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { TxView } from "./types";

interface QuickActions {
  openNew: (type?: TransactionType) => void;
  openEdit: (tx: TxView) => void;
}

const QuickCtx = createContext<QuickActions | null>(null);

export function useQuickActions() {
  const v = useContext(QuickCtx);
  if (!v) throw new Error("useQuickActions fora do provider");
  return v;
}

export function TransactionModalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ mode: "new"; type: TransactionType; key: number } | { mode: "edit"; tx: TxView; key: number } | null>(null);
  const actions = useMemo<QuickActions>(
    () => ({
      openNew: (type = "EXPENSE") => setState({ mode: "new", type, key: Date.now() }),
      openEdit: (tx) => setState({ mode: "edit", tx, key: Date.now() }),
    }),
    [],
  );
  const close = useCallback(() => setState(null), []);

  return (
    <QuickCtx.Provider value={actions}>
      {children}
      {state?.mode === "new" && <NewTransactionModal key={state.key} initialType={state.type} onClose={close} />}
      {state?.mode === "edit" && <EditTransactionModal key={state.key} tx={state.tx} onClose={close} />}
    </QuickCtx.Provider>
  );
}

const SUCCESS_MESSAGES: Record<TransactionType, string> = {
  INCOME: "💰 Receita adicionada!",
  EXPENSE: "💸 Despesa registrada!",
  TRANSFER: "🔁 Transferência realizada!",
};

function NewTransactionModal({ initialType, onClose }: { initialType: TransactionType; onClose: () => void }) {
  const { accounts, categories, cards, user } = useAppData();
  const money = useMoney();
  const router = useRouter();
  const toast = useToast();

  const [type, setType] = useState<TransactionType>(initialType);
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [date, setDate] = useState(toDateInput(new Date()));
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id ?? "");
  const [paymentMethod, setPaymentMethod] = useState<string>("PIX");
  const [creditCardId, setCreditCardId] = useState(cards[0]?.id ?? "");
  const [installments, setInstallments] = useState(1);
  const [notes, setNotes] = useState("");
  const [recurrence, setRecurrence] = useState("NONE");
  const [showMore, setShowMore] = useState(false);
  const [suggested, setSuggested] = useState<string[]>([]);
  const [userPicked, setUserPicked] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  const typeCategories = categories.filter((c) => c.type === (type === "INCOME" ? "INCOME" : "EXPENSE"));

  // Sugestão inteligente de categoria conforme a descrição é digitada
  useEffect(() => {
    if (type === "TRANSFER") return;
    const ctrl = { cancelled: false };
    const t = setTimeout(async () => {
      try {
        const ids = await api.get<string[]>(`/categories/suggest?type=${type}&q=${encodeURIComponent(description)}`);
        if (ctrl.cancelled) return;
        setSuggested(ids);
        if (!userPicked && description.trim().length >= 3 && ids[0]) setCategoryId(ids[0]);
      } catch {
        /* sugestão é opcional */
      }
    }, 250);
    return () => {
      ctrl.cancelled = true;
      clearTimeout(t);
    };
  }, [description, type, userPicked]);

  useEffect(() => {
    setCategoryId(null);
    setUserPicked(false);
    setErrors({});
    requestAnimationFrame(() => amountRef.current?.focus());
  }, [type]);

  const orderedCategories = useMemo(() => {
    const sug = suggested.map((id) => typeCategories.find((c) => c.id === id)).filter(Boolean) as typeof typeCategories;
    return [...sug, ...typeCategories.filter((c) => !suggested.includes(c.id))];
  }, [suggested, typeCategories]);

  const isCredit = type === "EXPENSE" && paymentMethod === "CREDIT";

  async function save() {
    const errs: Record<string, string> = {};
    if (amount <= 0) errs.amount = "Informe o valor";
    if (type !== "TRANSFER" && !categoryId) errs.categoryId = "Escolha uma categoria";
    if (type === "TRANSFER" && accountId === toAccountId) errs.toAccountId = "Escolha contas diferentes";
    if (isCredit && !creditCardId) errs.creditCardId = "Cadastre um cartão primeiro";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const cat = categories.find((c) => c.id === categoryId);
    setSaving(true);
    try {
      await api.post("/transactions", {
        type,
        amount,
        description: description.trim() || (type === "TRANSFER" ? "Transferência entre contas" : cat?.name ?? "Lançamento"),
        date,
        categoryId: type === "TRANSFER" ? null : categoryId,
        accountId: isCredit ? null : accountId || null,
        toAccountId: type === "TRANSFER" ? toAccountId : null,
        paymentMethod: type === "EXPENSE" ? paymentMethod : type === "TRANSFER" ? "TRANSFER" : null,
        creditCardId: isCredit ? creditCardId : null,
        installments: type === "EXPENSE" ? installments : 1,
        notes: notes || null,
        recurrence: installments > 1 ? "NONE" : recurrence,
      });
      toast.success(SUCCESS_MESSAGES[type], installments > 1 ? `${installments}x de ${money(Math.floor(amount / installments))}` : `${money(amount)}${description ? ` · ${description}` : ""}`);
      router.refresh();
      onClose();
    } catch (e) {
      if (e instanceof ApiClientError) {
        setErrors(e.fields);
        toast.error("Não foi possível salvar", e.message);
      }
    } finally {
      setSaving(false);
    }
  }

  const accent = type === "INCOME" ? "income" : type === "EXPENSE" ? "expense" : "primary";
  const today = toDateInput(new Date());
  const yesterday = toDateInput(addDays(new Date(), -1));

  return (
    <Modal
      open
      onClose={onClose}
      hideClose={false}
      title="Novo lançamento"
      footer={
        <Button variant={accent} size="lg" className="w-full" loading={saving} onClick={save}>
          {type === "INCOME" ? "Adicionar receita" : type === "EXPENSE" ? "Adicionar despesa" : "Transferir"}
        </Button>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="space-y-5"
      >
        <Segmented
          className="w-full"
          value={type}
          onChange={setType}
          options={[
            { value: "EXPENSE", label: <span className="flex items-center justify-center gap-1.5"><ArrowUpRight className="h-3.5 w-3.5 text-expense" />Despesa</span> },
            { value: "INCOME", label: <span className="flex items-center justify-center gap-1.5"><ArrowDownLeft className="h-3.5 w-3.5 text-income" />Receita</span> },
            { value: "TRANSFER", label: <span className="flex items-center justify-center gap-1.5"><ArrowLeftRight className="h-3.5 w-3.5 text-brand" />Transferência</span> },
          ]}
        />

        <div className="py-2">
          <MoneyInput ref={amountRef} size="hero" value={amount} onChange={setAmount} currency={user.currency} autoFocus invalid={!!errors.amount} />
          {errors.amount && <p className="mt-1 text-center text-xs font-medium text-danger">{errors.amount}</p>}
        </div>

        {type !== "TRANSFER" ? (
          <>
            <Input
              placeholder={type === "EXPENSE" ? "Descrição (ex.: Mercado, Uber...)" : "Descrição (ex.: Salário, Freelance...)"}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={120}
              aria-label="Descrição"
            />
            <div>
              <p className="mb-2 text-[13px] font-medium text-foreground/80">Categoria</p>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                {orderedCategories.map((c, i) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setCategoryId(c.id);
                      setUserPicked(true);
                    }}
                    className={cn(
                      "relative flex flex-col items-center gap-1 rounded-xl border px-1 py-2.5 text-[11px] font-medium transition-all active:scale-95",
                      categoryId === c.id ? "border-transparent ring-2" : "border-border hover:bg-subtle",
                    )}
                    style={categoryId === c.id ? ({ background: `color-mix(in srgb, ${c.color} 14%, transparent)`, "--tw-ring-color": c.color } as React.CSSProperties) : undefined}
                    aria-pressed={categoryId === c.id}
                  >
                    {i < suggested.length && description.length >= 2 && i === 0 && (
                      <span className="absolute -top-1.5 rounded-full bg-brand px-1.5 text-[9px] font-semibold text-white">sugerida</span>
                    )}
                    <span className="text-xl" aria-hidden>{c.icon}</span>
                    <span className="w-full truncate text-center">{c.name}</span>
                  </button>
                ))}
              </div>
              {errors.categoryId && <p className="mt-1.5 text-xs font-medium text-danger">{errors.categoryId}</p>}
            </div>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Field label="De" error={errors.accountId}>
              <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </Select>
            </Field>
            <Field label="Para" error={errors.toAccountId}>
              <Select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)}>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </Select>
            </Field>
            <Input className="col-span-2" placeholder="Descrição (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} />
            {accounts.length < 2 && <p className="col-span-2 text-xs text-muted">Cadastre pelo menos duas contas para transferir entre elas.</p>}
          </div>
        )}

        {/* Data rápida */}
        <div className="flex flex-wrap items-center gap-2">
          {[{ v: today, l: "Hoje" }, { v: yesterday, l: "Ontem" }].map((d) => (
            <button key={d.v} type="button" onClick={() => setDate(d.v)} className={cn("rounded-full px-3 py-1.5 text-xs font-medium transition-colors", date === d.v ? "bg-foreground text-background" : "bg-subtle text-muted hover:text-foreground")}>
              {d.l}
            </button>
          ))}
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="rounded-full bg-subtle px-3 py-1.5 text-xs font-medium text-muted outline-none" aria-label="Data" />
        </div>

        {type === "EXPENSE" && (
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
            {(["PIX", "DEBIT", "CREDIT", "CASH", "BOLETO"] as const).map((m) => (
              <button key={m} type="button" onClick={() => setPaymentMethod(m)} className={cn("shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors", paymentMethod === m ? "border-brand bg-brand-soft text-brand" : "border-border text-muted hover:text-foreground")}>
                {PAYMENT_METHOD_LABELS[m]}
              </button>
            ))}
          </div>
        )}

        {isCredit && (
          <div className="grid animate-fade-in grid-cols-2 gap-3">
            <Field label="Cartão" error={errors.creditCardId}>
              {cards.length ? (
                <Select value={creditCardId} onChange={(e) => setCreditCardId(e.target.value)}>
                  {cards.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              ) : (
                <p className="text-xs text-muted">Nenhum cartão cadastrado.</p>
              )}
            </Field>
            <Field label="Parcelas" hint={installments > 1 && amount > 0 ? `${installments}x de ${money(Math.floor(amount / installments))}` : undefined}>
              <Select value={installments} onChange={(e) => setInstallments(Number(e.target.value))}>
                {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n === 1 ? "À vista" : `${n}x`}</option>)}
              </Select>
            </Field>
          </div>
        )}

        <button type="button" onClick={() => setShowMore((s) => !s)} className="flex w-full items-center justify-center gap-1 text-[13px] font-medium text-muted hover:text-foreground">
          {showMore ? "Menos detalhes" : "Mais detalhes"} <ChevronDown className={cn("h-4 w-4 transition-transform", showMore && "rotate-180")} />
        </button>

        {showMore && (
          <div className="grid animate-fade-in gap-3 sm:grid-cols-2">
            {type !== "TRANSFER" && !isCredit && (
              <Field label="Conta">
                <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </Select>
              </Field>
            )}
            {type === "EXPENSE" && !isCredit && (
              <Field label="Parcelas" hint="Para boletos ou carnês parcelados">
                <Select value={installments} onChange={(e) => setInstallments(Number(e.target.value))}>
                  {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n === 1 ? "À vista" : `${n}x`}</option>)}
                </Select>
              </Field>
            )}
            {type === "EXPENSE" && (
              <Field label="Forma de pagamento">
                <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  {PAYMENT_METHODS.filter((m) => m !== "TRANSFER").map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>)}
                </Select>
              </Field>
            )}
            {type !== "TRANSFER" && installments === 1 && (
              <Field label={<span className="flex items-center gap-1"><Repeat className="h-3.5 w-3.5" /> Recorrência</span>}>
                <Select value={recurrence} onChange={(e) => setRecurrence(e.target.value)}>
                  {RECURRENCES.map((r) => <option key={r} value={r}>{RECURRENCE_LABELS[r]}</option>)}
                </Select>
              </Field>
            )}
            <Field label="Observação" className="sm:col-span-2">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} placeholder="Opcional" />
            </Field>
          </div>
        )}
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}

function EditTransactionModal({ tx, onClose }: { tx: TxView; onClose: () => void }) {
  const { accounts, categories, user } = useAppData();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [amount, setAmount] = useState(tx.amount);
  const [description, setDescription] = useState(tx.description);
  const [categoryId, setCategoryId] = useState(tx.categoryId ?? "");
  const [accountId, setAccountId] = useState(tx.accountId ?? "");
  const [date, setDate] = useState(toDateInput(new Date(tx.date)));
  const [notes, setNotes] = useState(tx.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isCard = !!tx.creditCardTransactionId;
  const readOnly = tx.isInvoicePayment;
  const typeCats = categories.filter((c) => c.type === (tx.type === "INCOME" ? "INCOME" : "EXPENSE"));
  const isRecurringHead = tx.recurrence !== "NONE" && !tx.recurrenceParentId;

  async function save(extra: Record<string, unknown> = {}) {
    setSaving(true);
    try {
      await api.patch(`/transactions/${tx.id}`, {
        description,
        notes: notes || null,
        ...(isCard ? {} : { amount, date }),
        ...(tx.type !== "TRANSFER" ? { categoryId: categoryId || null } : {}),
        ...(!tx.creditCardId && tx.type !== "TRANSFER" ? { accountId: accountId || null } : {}),
        ...extra,
      });
      toast.success("Alterações salvas ✨");
      router.refresh();
      onClose();
    } catch (e) {
      toast.error("Não foi possível salvar", e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    const group = tx.installmentGroupId && !isCard;
    const ok = await confirm({
      title: isCard ? "Excluir compra parcelada?" : tx.isInvoicePayment ? "Estornar pagamento da fatura?" : "Excluir lançamento?",
      description: isCard && tx.installmentTotal
        ? `Todas as ${tx.installmentTotal} parcelas desta compra serão removidas.`
        : group
          ? `Todas as ${tx.installmentTotal} parcelas serão removidas.`
          : tx.isInvoicePayment ? "As compras da fatura voltarão a ficar em aberto." : "Essa ação não pode ser desfeita.",
      confirmLabel: tx.isInvoicePayment ? "Estornar" : "Excluir",
      danger: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await api.delete(`/transactions/${tx.id}${group ? "?scope=all" : ""}`);
      toast.success("Lançamento excluído");
      router.refresh();
      onClose();
    } catch (e) {
      toast.error("Não foi possível excluir", e instanceof Error ? e.message : undefined);
      setDeleting(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={tx.type === "INCOME" ? "Editar receita" : tx.type === "EXPENSE" ? "Editar despesa" : "Transferência"}
      description={tx.installmentTotal ? `Parcela ${tx.installmentNumber} de ${tx.installmentTotal}${tx.creditCard ? ` · ${tx.creditCard.name}` : ""}` : tx.creditCard ? `Cartão ${tx.creditCard.name}` : undefined}
      footer={
        <>
          <Button variant="danger-ghost" size="icon" onClick={remove} loading={deleting} aria-label="Excluir"><Trash2 className="h-4 w-4" /></Button>
          {!readOnly && <Button className="flex-1" loading={saving} onClick={() => save()}>Salvar alterações</Button>}
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Valor" hint={isCard ? "Para alterar o valor de uma compra no cartão, exclua e lance novamente." : undefined}>
          {isCard || readOnly ? (
            <div className="tabular flex h-11 items-center rounded-xl bg-subtle px-3.5 text-sm font-medium">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: user.currency }).format(tx.amount / 100)}</div>
          ) : (
            <MoneyInput value={amount} onChange={setAmount} currency={user.currency} />
          )}
        </Field>
        <Field label="Descrição">
          <Input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={120} disabled={readOnly} />
        </Field>
        {tx.type !== "TRANSFER" && (
          <Field label="Categoria">
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Sem categoria</option>
              {typeCats.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </Select>
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={isCard || readOnly} />
          </Field>
          {!tx.creditCardId && tx.type !== "TRANSFER" && (
            <Field label="Conta">
              <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </Select>
            </Field>
          )}
        </div>
        {!readOnly && (
          <Field label="Observação">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
          </Field>
        )}
        {isRecurringHead && (
          <div className="flex items-center justify-between rounded-xl bg-brand-soft px-3.5 py-3">
            <p className="flex items-center gap-2 text-[13px] font-medium text-brand"><Repeat className="h-4 w-4" />Repete: {RECURRENCE_LABELS[tx.recurrence as keyof typeof RECURRENCE_LABELS]}</p>
            <Button size="sm" variant="outline" onClick={() => save({ stopRecurrence: true })}>Parar de repetir</Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
