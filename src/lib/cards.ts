import { dateAtDay, monthKey, monthKeyAdd } from "./dates";

// Convenção: a fatura é identificada pelo mês do VENCIMENTO ("AAAA-MM").

interface CardDays {
  closingDay: number;
  dueDay: number;
}

/** Em qual fatura cai uma compra feita em `date`. */
export function invoiceKeyFor(card: CardDays, date: Date) {
  const closingThisMonth = dateAtDay(date.getFullYear(), date.getMonth(), card.closingDay);
  // Compras no dia do fechamento ou depois entram na fatura seguinte
  const closingMonth =
    date.getDate() >= closingThisMonth.getDate()
      ? new Date(date.getFullYear(), date.getMonth() + 1, 1)
      : new Date(date.getFullYear(), date.getMonth(), 1);
  const dueMonth = card.dueDay > card.closingDay ? closingMonth : new Date(closingMonth.getFullYear(), closingMonth.getMonth() + 1, 1);
  return monthKey(dueMonth);
}

export function invoiceDates(card: CardDays, key: string) {
  const [y, m] = key.split("-").map(Number);
  const due = dateAtDay(y, m - 1, card.dueDay);
  const closingMonthOffset = card.dueDay > card.closingDay ? 0 : -1;
  const closing = dateAtDay(y, m - 1 + closingMonthOffset, card.closingDay);
  return { closing, due };
}

export type InvoiceStatus = "OPEN" | "CLOSED" | "PAID" | "OVERDUE" | "FUTURE";

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  OPEN: "Aberta",
  CLOSED: "Fechada",
  PAID: "Paga",
  OVERDUE: "Vencida",
  FUTURE: "Futura",
};

export function invoiceStatus(card: CardDays, key: string, unpaid: number, total: number, now = new Date()): InvoiceStatus {
  const { closing, due } = invoiceDates(card, key);
  const current = currentInvoiceKey(card, now);
  if (total > 0 && unpaid === 0) return "PAID";
  if (key > current) return "FUTURE";
  if (now > due) return unpaid > 0 ? "OVERDUE" : "PAID";
  if (now >= closing) return "CLOSED";
  return "OPEN";
}

/** Fatura "atual" = a que está aberta recebendo compras hoje. */
export function currentInvoiceKey(card: CardDays, now = new Date()) {
  return invoiceKeyFor(card, now);
}

export function nextInvoiceKey(card: CardDays, now = new Date()) {
  return monthKeyAdd(currentInvoiceKey(card, now), 1);
}

/** Divide o total em parcelas; os centavos de sobra vão para a primeira. */
export function splitInstallments(total: number, n: number) {
  const base = Math.floor(total / n);
  const rest = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i === 0 ? rest : 0));
}
