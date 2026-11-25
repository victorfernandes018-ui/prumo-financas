// Todos os valores monetários trafegam em centavos (inteiros).

const formatters = new Map<string, Intl.NumberFormat>();

function formatter(currency: string, compact = false) {
  const key = `${currency}-${compact}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency,
      ...(compact ? { notation: "compact", maximumFractionDigits: 1 } : {}),
    });
    formatters.set(key, f);
  }
  return f;
}

export function formatMoney(cents: number, currency = "BRL") {
  return formatter(currency).format(cents / 100);
}

export function formatMoneyCompact(cents: number, currency = "BRL") {
  if (Math.abs(cents) < 100_000) return formatMoney(cents, currency);
  return formatter(currency, true).format(cents / 100);
}

/** Converte texto digitado ("1.234,56", "35", "35,5") para centavos. */
export function parseMoneyInput(value: string): number {
  const clean = value.replace(/[^\d,.-]/g, "");
  if (!clean) return 0;
  // Formato brasileiro: ponto = milhar, vírgula = decimal
  const normalized = clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean;
  const n = Number.parseFloat(normalized);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

/** Máscara de digitação estilo "caixa eletrônico": os dígitos preenchem da direita para a esquerda. */
export function maskMoneyDigits(digits: string): { cents: number; display: string } {
  const only = digits.replace(/\D/g, "").replace(/^0+/, "").slice(0, 11);
  const cents = only ? Number.parseInt(only, 10) : 0;
  const display = (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return { cents, display };
}

export function formatPercent(value: number, digits = 1) {
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}
