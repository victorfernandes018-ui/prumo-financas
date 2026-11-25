"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { LogoMark } from "@/components/layout/logo";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/api-client";
import { DEFAULT_CATEGORIES, GOAL_TEMPLATES } from "@/lib/constants";
import { cn, firstName } from "@/lib/utils";

const EXPENSE_OPTIONS = DEFAULT_CATEGORIES.filter((c) => c.type === "EXPENSE" && c.name !== "Outros");
const STEPS = 6;

function Choice({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={selected} className={cn("flex items-center justify-between rounded-2xl border px-4 py-3.5 text-left text-sm font-medium transition-all active:scale-[0.98]", selected ? "border-brand bg-brand-soft text-brand ring-2 ring-brand/20" : "border-border bg-card hover:bg-subtle")}>
      {children}
      {selected && <Check className="h-4 w-4" />}
    </button>
  );
}

export function OnboardingWizard({ name, currency }: { name: string; currency: string }) {
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState({
    monthlyIncome: 0,
    currentBalance: 0,
    mainExpenses: ["Moradia", "Alimentação", "Transporte"] as string[],
    hasDebts: false as boolean | null,
    debtMonthlyAmount: 0,
    hasCreditCard: true as boolean | null,
    creditCardName: "",
    creditCardLimit: 0,
    mainGoal: "Reserva de emergência" as string | null,
    mainGoalTarget: 0,
  });

  const next = () => setStep((s) => Math.min(s + 1, STEPS));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  async function finish() {
    setStep(STEPS);
    setSaving(true);
    try {
      await api.post("/onboarding", {
        ...data,
        hasDebts: !!data.hasDebts,
        hasCreditCard: !!data.hasCreditCard,
        creditCardName: data.creditCardName || null,
        mainGoalTarget: data.mainGoalTarget || null,
      });
      await new Promise((r) => setTimeout(r, 1200)); // tempo para a animação respirar
      toast.success("Tudo pronto! 🎉", "Seu painel financeiro foi criado.");
      window.location.assign("/dashboard");
    } catch (e) {
      toast.error("Não foi possível concluir", errorMessage(e));
      setSaving(false);
      setStep(STEPS - 1);
    }
  }

  const canNext = [true, data.monthlyIncome > 0, data.mainExpenses.length > 0, data.hasDebts !== null, data.hasCreditCard !== null, true][step] ?? true;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="mx-auto flex w-full max-w-xl items-center gap-4 px-5 pt-6">
        <LogoMark size={30} />
        {step > 0 && step < STEPS && (
          <div className="flex flex-1 gap-1.5" aria-label={`Passo ${step} de ${STEPS - 1}`}>
            {Array.from({ length: STEPS - 1 }, (_, i) => (
              <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-subtle">
                <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: i < step ? "100%" : "0%" }} />
              </div>
            ))}
          </div>
        )}
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-5 py-8">
        <div key={step} className="flex flex-1 animate-slide-up flex-col">
          {step === 0 && (
            <div className="my-auto text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-soft text-4xl">👋</div>
              <h1 className="text-3xl font-semibold tracking-tight">Olá, {firstName(name)}!</h1>
              <p className="mt-2 text-xl text-foreground/90">Vamos organizar sua vida financeira.</p>
              <p className="mx-auto mt-3 max-w-sm text-sm text-muted">São só 5 perguntas rápidas. Com elas, montamos um painel inicial feito para você.</p>
            </div>
          )}

          {step === 1 && (
            <div>
              <p className="text-sm font-medium text-brand">1 de 5</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">Qual sua renda mensal?</h2>
              <p className="mt-1 text-sm text-muted">Some salário e outras entradas fixas. Você poderá ajustar depois.</p>
              <div className="my-10"><MoneyInput size="hero" value={data.monthlyIncome} onChange={(v) => setData({ ...data, monthlyIncome: v })} currency={currency} autoFocus /></div>
              <Field label="Quanto você tem hoje na sua conta principal?" hint="Opcional — usamos como saldo inicial.">
                <MoneyInput value={data.currentBalance} onChange={(v) => setData({ ...data, currentBalance: v })} currency={currency} allowNegative />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div>
              <p className="text-sm font-medium text-brand">2 de 5</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">Quais são seus principais gastos?</h2>
              <p className="mt-1 text-sm text-muted">Vamos sugerir um orçamento para cada um. Escolha quantos quiser.</p>
              <div className="mt-6 grid grid-cols-2 gap-2.5">
                {EXPENSE_OPTIONS.map((c) => {
                  const on = data.mainExpenses.includes(c.name);
                  return (
                    <Choice key={c.name} selected={on} onClick={() => setData({ ...data, mainExpenses: on ? data.mainExpenses.filter((x) => x !== c.name) : [...data.mainExpenses, c.name] })}>
                      <span><span className="mr-2 text-lg">{c.icon}</span>{c.name}</span>
                    </Choice>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <p className="text-sm font-medium text-brand">3 de 5</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">Você possui dívidas?</h2>
              <p className="mt-1 text-sm text-muted">Financiamentos, empréstimos ou acordos com parcelas mensais.</p>
              <div className="mt-6 grid gap-2.5">
                <Choice selected={data.hasDebts === false} onClick={() => setData({ ...data, hasDebts: false })}><span>🙌 Não, estou livre de dívidas</span></Choice>
                <Choice selected={data.hasDebts === true} onClick={() => setData({ ...data, hasDebts: true })}><span>📄 Sim, tenho parcelas a pagar</span></Choice>
              </div>
              {data.hasDebts && (
                <Field label="Quanto você paga por mês, somando tudo?" className="mt-5 animate-fade-in">
                  <MoneyInput value={data.debtMonthlyAmount} onChange={(v) => setData({ ...data, debtMonthlyAmount: v })} currency={currency} autoFocus />
                </Field>
              )}
            </div>
          )}

          {step === 4 && (
            <div>
              <p className="text-sm font-medium text-brand">4 de 5</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">Possui cartão de crédito?</h2>
              <p className="mt-1 text-sm text-muted">Acompanhe faturas, limite disponível e parcelamentos.</p>
              <div className="mt-6 grid gap-2.5">
                <Choice selected={data.hasCreditCard === true} onClick={() => setData({ ...data, hasCreditCard: true })}><span>💳 Sim, uso cartão de crédito</span></Choice>
                <Choice selected={data.hasCreditCard === false} onClick={() => setData({ ...data, hasCreditCard: false })}><span>🚫 Não uso cartão</span></Choice>
              </div>
              {data.hasCreditCard && (
                <div className="mt-5 grid animate-fade-in grid-cols-2 gap-3">
                  <Field label="Nome do cartão"><Input value={data.creditCardName} onChange={(e) => setData({ ...data, creditCardName: e.target.value })} placeholder="Ex.: Nubank" /></Field>
                  <Field label="Limite"><MoneyInput value={data.creditCardLimit} onChange={(v) => setData({ ...data, creditCardLimit: v })} currency={currency} /></Field>
                </div>
              )}
            </div>
          )}

          {step === 5 && (
            <div>
              <p className="text-sm font-medium text-brand">5 de 5</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">Qual sua principal meta financeira?</h2>
              <p className="mt-1 text-sm text-muted">Vamos criar essa meta para você acompanhar desde já.</p>
              <div className="mt-6 grid grid-cols-2 gap-2.5">
                {GOAL_TEMPLATES.map((g) => (
                  <Choice key={g.name} selected={data.mainGoal === g.name} onClick={() => setData({ ...data, mainGoal: g.name })}><span><span className="mr-2 text-lg">{g.icon}</span>{g.name}</span></Choice>
                ))}
                <Choice selected={data.mainGoal === null} onClick={() => setData({ ...data, mainGoal: null })}><span>Decido depois</span></Choice>
              </div>
              {data.mainGoal && (
                <Field label="Quanto você quer juntar?" hint={data.mainGoal === "Reserva de emergência" ? "Deixe em branco e sugerimos 6 meses da sua renda." : "Opcional"} className="mt-5">
                  <MoneyInput value={data.mainGoalTarget} onChange={(v) => setData({ ...data, mainGoalTarget: v })} currency={currency} />
                </Field>
              )}
            </div>
          )}

          {step === STEPS && (
            <div className="my-auto text-center" aria-live="polite">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-soft">
                {saving ? <Loader2 className="h-9 w-9 animate-spin text-brand" /> : <Check className="h-9 w-9 text-brand" />}
              </div>
              <h2 className="text-2xl font-semibold tracking-tight">Criando seu painel financeiro...</h2>
              <p className="mt-2 text-sm text-muted">Configurando contas, orçamento e metas com base nas suas respostas.</p>
            </div>
          )}
        </div>

        {step < STEPS && (
          <div className="mt-8 flex gap-3">
            {step > 0 && <Button variant="secondary" size="lg" onClick={back} aria-label="Voltar"><ArrowLeft className="h-4 w-4" /></Button>}
            <Button size="lg" className="flex-1" disabled={!canNext} onClick={step === STEPS - 1 ? finish : next}>
              {step === 0 ? "Começar" : step === STEPS - 1 ? "Criar meu painel" : "Continuar"} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
