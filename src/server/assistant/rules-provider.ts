import "server-only";
import { CATEGORY_KEYWORDS } from "@/lib/constants";
import { MONTHS_PT } from "@/lib/dates";
import { formatMoney, percentChange } from "@/lib/money";
import { normalize } from "@/lib/utils";
import type { AssistantProvider, AssistantReply, FinancialSnapshot } from "./types";

// Sinônimos coloquiais → nome da categoria
const SYNONYMS: Record<string, string> = {
  comida: "Alimentação", comer: "Alimentação", restaurante: "Alimentação", ifood: "Alimentação", mercado: "Alimentação",
  carro: "Transporte", uber: "Transporte", gasolina: "Transporte", combustivel: "Transporte",
  casa: "Moradia", aluguel: "Moradia", diversao: "Lazer", passeio: "Lazer", roupa: "Compras",
  remedio: "Saúde", farmacia: "Saúde", academia: "Saúde", curso: "Educação", faculdade: "Educação",
  streaming: "Assinaturas", netflix: "Assinaturas", spotify: "Assinaturas", luz: "Contas", internet: "Contas",
};

const DEFAULT_SUGGESTIONS = [
  "Quanto gastei com comida esse mês?",
  "Quanto posso gastar até o final do mês?",
  "Quais foram meus maiores gastos?",
  "Estou gastando mais do que deveria?",
];

const has = (q: string, ...words: string[]) => words.some((w) => q.includes(w));

export class RulesProvider implements AssistantProvider {
  id = "rules";

  async reply(message: string, s: FinancialSnapshot): Promise<AssistantReply> {
    const q = normalize(message);
    const m = (v: number) => formatMoney(v, s.currency);
    const monthName = MONTHS_PT[new Date(s.period.start).getMonth()];

    if (s.month.income === 0 && s.month.expense === 0 && s.balance === 0) {
      return {
        source: "rules",
        text: "Ainda não encontrei lançamentos suficientes para responder com precisão. Registre suas receitas e despesas e eu passo a analisar tudo com base nos seus dados. 🙂",
        suggestions: ["Como começo a organizar minhas finanças?"],
      };
    }

    // 1) Gastos por categoria
    const category = this.findCategory(q, s);
    if (category && has(q, "gast", "quanto", "despes", "paguei")) {
      const c = s.categories.find((x) => normalize(x.name) === normalize(category));
      const amount = c?.amount ?? 0;
      const change = c ? percentChange(c.amount, c.previousAmount) : null;
      const budget = s.budgets.find((b) => normalize(b.category) === normalize(category));
      let text = amount
        ? `Em ${monthName} você gastou **${m(amount)}** com ${category.toLowerCase()} ${c?.icon ?? ""}.`
        : `Você ainda não registrou gastos com ${category.toLowerCase()} em ${monthName}. 👏`;
      if (change !== null && c?.previousAmount) text += ` Isso é ${Math.abs(Math.round(change))}% ${change >= 0 ? "a mais" : "a menos"} que no mês passado (${m(c.previousAmount)}).`;
      if (budget) text += budget.spent > budget.amount ? ` ⚠️ Você passou ${m(budget.spent - budget.amount)} do orçamento de ${m(budget.amount)}.` : ` Ainda restam ${m(budget.amount - budget.spent)} do seu orçamento de ${m(budget.amount)}.`;
      return { source: "rules", text, suggestions: ["Quais foram meus maiores gastos?", "Quanto posso gastar até o final do mês?"] };
    }

    // 2) Quanto posso gastar
    if (has(q, "posso gastar", "pode gastar", "sobra", "disponivel", "ate o final", "ate o fim")) {
      const pending = s.pendingBills.reduce((a, b) => a + b.amount, 0);
      const free = s.month.net - pending;
      const perDay = free / s.period.daysLeft;
      const text = free > 0
        ? `Descontando as contas fixas que ainda vão vencer (${m(pending)}), você pode gastar até **${m(free)}** até o fim do mês — cerca de **${m(Math.floor(perDay))} por dia** nos próximos ${s.period.daysLeft} dias.`
        : `Considerando receitas, despesas e as contas fixas pendentes (${m(pending)}), seu orçamento do mês já está no limite: faltam ${m(-free)} para fechar no zero. Vale segurar gastos não essenciais.`;
      return {
        source: "rules",
        text,
        highlights: [
          { label: "Receitas", value: m(s.month.income), tone: "positive" },
          { label: "Despesas", value: m(s.month.expense), tone: "negative" },
          { label: "Contas pendentes", value: m(pending), tone: "neutral" },
        ],
        suggestions: ["Quais contas ainda vão vencer?", "Estou gastando mais do que deveria?"],
      };
    }

    // 3) Contas pendentes
    if (has(q, "vencer", "vence", "contas fixas", "boletos", "pendente")) {
      if (!s.pendingBills.length) return { source: "rules", text: "Todas as suas contas fixas deste mês já estão pagas. ✅" };
      const list = s.pendingBills.sort((a, b) => a.dueDay - b.dueDay).map((b) => `• ${b.name} — ${m(b.amount)} (dia ${b.dueDay})`).join("\n");
      return { source: "rules", text: `Ainda faltam pagar ${s.pendingBills.length} conta(s) este mês:\n${list}` };
    }

    // 4) Maiores gastos
    if (has(q, "maior", "maiores", "mais gastei", "top")) {
      if (!s.topExpenses.length) return { source: "rules", text: `Nenhuma despesa registrada em ${monthName} ainda.` };
      const list = s.topExpenses.slice(0, 5).map((t, i) => `${i + 1}. ${t.description} — ${m(t.amount)} (${t.category})`).join("\n");
      const topCat = s.categories[0];
      return {
        source: "rules",
        text: `Seus maiores gastos em ${monthName}:\n${list}${topCat ? `\n\nA categoria que mais pesou foi **${topCat.name}** ${topCat.icon}, com ${m(topCat.amount)}.` : ""}`,
        suggestions: [`Quanto gastei com ${topCat?.name.toLowerCase() ?? "alimentação"}?`],
      };
    }

    // 5) Metas
    if (has(q, "meta", "economizar para", "juntar", "guardar", "atingir")) {
      if (!s.goals.length) return { source: "rules", text: "Você ainda não criou nenhuma meta. Que tal começar pela reserva de emergência? 🎯" };
      const named = s.goals.find((g) => q.includes(normalize(g.name)) || normalize(g.name).split(" ").some((w) => w.length > 4 && q.includes(w)));
      const goals = named ? [named] : s.goals.filter((g) => g.current < g.target);
      if (!goals.length) return { source: "rules", text: "Todas as suas metas já foram concluídas! 🎉" };
      const lines = goals.map((g) => {
        const missing = g.target - g.current;
        if (missing <= 0) return `• ${g.name}: concluída! 🎉`;
        if (g.deadline) {
          const months = Math.max(1, Math.ceil((new Date(g.deadline).getTime() - Date.now()) / (30 * 86_400_000)));
          return `• ${g.name}: faltam ${m(missing)} — guardando **${m(Math.ceil(missing / months))}/mês** você chega lá em ${months} ${months === 1 ? "mês" : "meses"}.`;
        }
        const pace = s.month.net > 0 ? Math.ceil(missing / s.month.net) : null;
        return `• ${g.name}: faltam ${m(missing)}${pace ? ` — no ritmo de economia deste mês (${m(s.month.net)}), levaria cerca de ${pace} ${pace === 1 ? "mês" : "meses"}` : ""}.`;
      });
      return { source: "rules", text: `Veja quanto falta para suas metas:\n${lines.join("\n")}` };
    }

    // 6) Diagnóstico geral
    if (has(q, "mais do que deveria", "gastando muito", "estou bem", "como estou", "saude", "diagnostico", "gastando demais")) {
      const rate = s.month.income ? (s.month.net / s.month.income) * 100 : 0;
      const over = s.budgets.filter((b) => b.spent > b.amount);
      const rising = s.categories.filter((c) => c.previousAmount > 0 && c.amount > c.previousAmount * 1.15).slice(0, 2);
      const parts: string[] = [];
      if (s.month.income === 0) parts.push("Ainda não há receitas registradas neste mês, então não consigo comparar com seus gastos.");
      else if (rate >= 20) parts.push(`Não! Você está guardando **${Math.round(rate)}%** da sua renda este mês — acima dos 20% recomendados. 👏`);
      else if (rate > 0) parts.push(`Você está no azul, guardando ${Math.round(rate)}% da renda. O ideal é chegar a 20%.`);
      else parts.push(`Sim — neste mês suas despesas (${m(s.month.expense)}) superam suas receitas (${m(s.month.income)}).`);
      if (over.length) parts.push(`Orçamentos estourados: ${over.map((o) => `${o.category} (+${m(o.spent - o.amount)})`).join(", ")}.`);
      if (rising.length) parts.push(`Atenção ao aumento em ${rising.map((r) => `${r.name.toLowerCase()} (+${Math.round(((r.amount - r.previousAmount) / r.previousAmount) * 100)}%)`).join(" e ")} em relação ao mês passado.`);
      return { source: "rules", text: parts.join("\n\n"), suggestions: ["Quais foram meus maiores gastos?", "Quanto posso gastar até o final do mês?"] };
    }

    // 7) Cartão
    if (has(q, "cartao", "fatura", "credito", "limite")) {
      if (!s.cards.length) return { source: "rules", text: "Você não tem cartões cadastrados." };
      const total = s.cards.reduce((a, c) => a + c.creditSpentThisMonth, 0);
      const lines = s.cards.map((c) => `• ${c.name}: fatura atual ${m(c.currentInvoice)} · limite disponível ${m(c.available)} de ${m(c.limit)}`).join("\n");
      return { source: "rules", text: `Em ${monthName} você lançou **${m(total)}** em compras no cartão (considerando as parcelas do mês).\n${lines}` };
    }

    // 8) Saldo
    if (has(q, "saldo", "quanto tenho", "dinheiro tenho", "contas bancarias")) {
      const lines = s.accounts.map((a) => `• ${a.name}: ${m(a.balance)}`).join("\n");
      return { source: "rules", text: `Seu saldo total é **${m(s.balance)}**.\n${lines}` };
    }

    // 9) Receitas
    if (has(q, "ganhei", "receita", "renda", "recebi", "salario")) {
      const change = percentChange(s.month.income, s.previousMonth.income);
      return {
        source: "rules",
        text: `Em ${monthName} você recebeu **${m(s.month.income)}**${change !== null && s.previousMonth.income ? ` (${change >= 0 ? "+" : ""}${Math.round(change)}% vs. mês passado)` : ""}.`,
      };
    }

    // 10) Economia
    if (has(q, "economizei", "economia", "poupei", "guardei")) {
      return { source: "rules", text: s.month.net >= 0 ? `Até agora, neste mês, sobraram **${m(s.month.net)}** entre receitas e despesas.` : `Neste mês as despesas estão ${m(-s.month.net)} acima das receitas.` };
    }

    return {
      source: "rules",
      text: "Ainda estou aprendendo! Por enquanto consigo responder sobre gastos por categoria, quanto você pode gastar, maiores gastos, metas, cartões, saldo e contas a vencer — sempre com base nos seus lançamentos.",
      suggestions: DEFAULT_SUGGESTIONS,
    };
  }

  private findCategory(q: string, s: FinancialSnapshot) {
    for (const [word, cat] of Object.entries(SYNONYMS)) if (new RegExp(`\\b${word}`).test(q)) return cat;
    const names = new Set([...s.categories.map((c) => c.name), ...Object.keys(CATEGORY_KEYWORDS)]);
    for (const name of names) if (q.includes(normalize(name))) return name;
    return null;
  }
}

export { DEFAULT_SUGGESTIONS };
