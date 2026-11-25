"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUp, ShieldCheck, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAppData } from "@/components/providers/app-data";
import { api, errorMessage } from "@/lib/api-client";
import { cn, firstName } from "@/lib/utils";

interface Reply {
  text: string;
  highlights?: { label: string; value: string; tone?: "positive" | "negative" | "neutral" }[];
  suggestions?: string[];
  source: "rules" | "ai";
}
interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;
  reply?: Reply;
  error?: boolean;
}

const STARTERS = [
  "Quanto gastei com comida esse mês?",
  "Quanto posso gastar até o final do mês?",
  "Quais foram meus maiores gastos?",
  "Quanto preciso economizar para atingir minha meta?",
  "Estou gastando mais do que deveria?",
  "Quanto gastei com cartão?",
];

/** Renderiza **negrito** e quebras de linha com segurança (sem HTML arbitrário). */
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => (
        <p key={i} className={cn(line === "" && "h-2")}>
          {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => (part.startsWith("**") ? <b key={j}>{part.slice(2, -2)}</b> : <span key={j}>{part}</span>))}
        </p>
      ))}
    </>
  );
}

export function AssistantView() {
  const { user } = useAppData();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Corpo em bloco: scrollIntoView pode retornar uma Promise, que não deve virar "cleanup" do efeito
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, thinking]);

  async function ask(text: string) {
    const q = text.trim();
    if (!q || thinking) return;
    setMessages((m) => [...m, { id: Date.now(), role: "user", text: q }]);
    setInput("");
    setThinking(true);
    try {
      const history = messages.filter((m) => !m.error).slice(-8).map((m) => ({ role: m.role, content: m.text.slice(0, 2000) }));
      const reply = await api.post<Reply>("/assistant", { message: q, history });
      setMessages((m) => [...m, { id: Date.now() + 1, role: "assistant", text: reply.text, reply }]);
    } catch (e) {
      setMessages((m) => [...m, { id: Date.now() + 1, role: "assistant", text: errorMessage(e), error: true }]);
    } finally {
      setThinking(false);
      inputRef.current?.focus();
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    ask(input);
  };

  return (
    <div className="mx-auto flex h-[calc(100dvh-64px-24px-128px)] max-w-3xl flex-col lg:h-[calc(100dvh-64px-24px-48px)]">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-violet-500 text-white shadow-lg shadow-brand/25"><Sparkles className="h-5 w-5" /></div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Meu Assistente</h1>
          <p className="flex items-center gap-1 text-xs text-muted"><ShieldCheck className="h-3.5 w-3.5 text-income" /> Respostas baseadas apenas nos seus dados cadastrados</p>
        </div>
      </div>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6" aria-live="polite">
          {messages.length === 0 && (
            <div className="flex h-full animate-fade-in flex-col items-center justify-center text-center">
              <p className="text-3xl">👋</p>
              <h2 className="mt-3 text-lg font-semibold">Olá, {firstName(user.name)}! Como posso ajudar?</h2>
              <p className="mt-1 max-w-md text-sm text-muted">Pergunte sobre seus gastos, orçamento, cartões ou metas. Eu analiso seus lançamentos e respondo com números reais.</p>
              <div className="mt-6 grid w-full max-w-xl gap-2 sm:grid-cols-2">
                {STARTERS.map((s) => (
                  <button key={s} onClick={() => ask(s)} className="rounded-xl border border-border px-3.5 py-3 text-left text-[13px] transition-colors hover:border-brand/40 hover:bg-brand-soft">{s}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={cn("flex animate-slide-up", m.role === "user" ? "justify-end" : "justify-start")}>
              {m.role === "assistant" && <div className="mt-1 mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand"><Sparkles className="h-3.5 w-3.5" /></div>}
              <div className={cn("max-w-[85%] space-y-1 rounded-2xl px-4 py-2.5 text-sm leading-relaxed", m.role === "user" ? "rounded-br-md bg-brand text-white" : m.error ? "rounded-bl-md bg-expense-soft text-expense" : "rounded-bl-md bg-subtle")}>
                <RichText text={m.text} />
                {m.reply?.source === "ai" && <p className="pt-1 text-[10px] font-medium text-muted">✦ Resposta gerada por IA com base nos seus dados</p>}
                {m.reply?.highlights && (
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    {m.reply.highlights.map((h) => (
                      <div key={h.label} className="rounded-lg bg-card px-2.5 py-2">
                        <p className="text-[10px] text-muted">{h.label}</p>
                        <p className={cn("tabular text-[13px] font-semibold", h.tone === "positive" && "text-income", h.tone === "negative" && "text-expense")}>{h.value}</p>
                      </div>
                    ))}
                  </div>
                )}
                {m.reply?.suggestions && m.reply.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {m.reply.suggestions.map((s) => <button key={s} onClick={() => ask(s)} className="rounded-full border border-border bg-card px-2.5 py-1 text-xs text-foreground hover:border-brand/40">{s}</button>)}
                  </div>
                )}
              </div>
            </div>
          ))}

          {thinking && (
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-soft text-brand"><Sparkles className="h-3.5 w-3.5" /></div>
              <div className="flex gap-1 rounded-2xl bg-subtle px-4 py-3" aria-label="Analisando">
                {[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${i * 120}ms` }} />)}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form onSubmit={submit} className="border-t border-border p-3">
          <div className="flex items-end gap-2 rounded-2xl border border-border bg-background px-3 py-2 focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  ask(input);
                }
              }}
              rows={1}
              maxLength={500}
              placeholder="Pergunte algo sobre suas finanças..."
              className="max-h-32 flex-1 resize-none bg-transparent py-1.5 text-sm outline-none placeholder:text-muted"
              aria-label="Mensagem para o assistente"
            />
            <button type="submit" disabled={!input.trim() || thinking} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white transition disabled:opacity-40" aria-label="Enviar">
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-center text-[10px] text-muted">O assistente usa somente os dados que você cadastrou. Confira valores importantes antes de tomar decisões.</p>
        </form>
      </Card>
    </div>
  );
}
