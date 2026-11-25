export interface FinancialSnapshot {
  currency: string;
  today: string;
  period: { start: string; end: string; daysLeft: number };
  balance: number;
  accounts: { name: string; type: string; balance: number }[];
  month: { income: number; expense: number; net: number };
  previousMonth: { income: number; expense: number; net: number };
  categories: { name: string; icon: string; amount: number; previousAmount: number }[];
  topExpenses: { description: string; amount: number; date: string; category: string }[];
  budgets: { category: string; amount: number; spent: number }[];
  goals: { name: string; target: number; current: number; deadline: string | null }[];
  cards: { name: string; currentInvoice: number; limit: number; available: number; creditSpentThisMonth: number }[];
  pendingBills: { name: string; amount: number; dueDay: number }[];
}

export interface AssistantReply {
  text: string;
  highlights?: { label: string; value: string; tone?: "positive" | "negative" | "neutral" }[];
  suggestions?: string[];
  source: "rules" | "ai";
}

/**
 * Contrato para qualquer motor de respostas (regras locais, Claude, outro LLM).
 * O provedor recebe APENAS o snapshot calculado a partir dos dados do usuário,
 * e deve responder somente com base nele — nunca inventar valores.
 */
export interface AssistantProvider {
  id: string;
  reply(message: string, snapshot: FinancialSnapshot, history?: { role: "user" | "assistant"; content: string }[]): Promise<AssistantReply>;
}
