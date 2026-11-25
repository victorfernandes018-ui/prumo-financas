import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { AssistantProvider, AssistantReply, FinancialSnapshot } from "./types";

const SYSTEM_PROMPT = `Você é o assistente financeiro do Prumo, um app brasileiro de finanças pessoais.
Você conversa com o próprio dono dos dados, em português do Brasil, de forma clara, calorosa e direta.

Regras:
- Responda SOMENTE com base nos dados em <dados_financeiros>. Nunca invente valores, transações, datas ou categorias.
- Se a pergunta exigir algo que não está nos dados, diga isso com naturalidade e sugira o que o usuário pode registrar no app.
- Os valores estão em reais (já convertidos). Escreva-os no formato brasileiro, ex.: R$ 1.234,56.
- "month" é o mês financeiro atual (period.start até period.end); "previousMonth" é o anterior. daysLeft = dias restantes no mês.
- Seja breve: no máximo ~120 palavras. Destaque números-chave com **negrito**. Para listas, use linhas começando com "• ". Não use títulos, tabelas nem blocos de código.
- Você pode dar dicas gerais de organização financeira, mas não recomende produtos, ativos ou instituições específicas.
- Se a pergunta não tiver relação com as finanças do usuário, redirecione gentilmente.`;

// Campos que NÃO são dinheiro (não converter de centavos)
const NON_MONEY = new Set(["dueDay", "daysLeft"]);

function centsToReais(value: unknown, key = ""): unknown {
  if (typeof value === "number") return NON_MONEY.has(key) ? value : Math.round(value) / 100;
  if (Array.isArray(value)) return value.map((v) => centsToReais(v));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, centsToReais(v, k)]));
  }
  return value;
}

type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export class ClaudeProvider implements AssistantProvider {
  id = "claude";
  private client = new Anthropic({ timeout: 45_000, maxRetries: 1 }); // lê ANTHROPIC_API_KEY do ambiente

  async reply(message: string, snapshot: FinancialSnapshot, history: { role: "user" | "assistant"; content: string }[] = []): Promise<AssistantReply> {
    const data = JSON.stringify(centsToReais(snapshot));
    const messages: Anthropic.Beta.BetaMessageParam[] = [
      { role: "user", content: `<dados_financeiros>\n${data}\n</dados_financeiros>` },
      ...history.slice(-8).map((h) => ({ role: h.role, content: h.content })),
      { role: "user", content: message },
    ];

    const response = await this.client.beta.messages.create({
      model: process.env.AI_MODEL || "claude-opus-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default", // se o modelo recusar, o próprio servidor tenta o fallback recomendado
      thinking: { type: "adaptive" },
      output_config: { effort: (process.env.AI_EFFORT as Effort) || "low" }, // chat: respostas rápidas
      system: SYSTEM_PROMPT,
      messages,
    });

    if (response.stop_reason === "refusal") {
      throw new AssistantRefusal();
    }
    const text = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    if (!text) throw new Error("resposta vazia");
    return { text, source: "ai" };
  }
}

export class AssistantRefusal extends Error {}
