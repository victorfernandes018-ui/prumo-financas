// Datas "de calendário" são armazenadas ao meio-dia local para não "pularem" de dia entre fusos.

export const MONTHS_PT = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
export const MONTHS_SHORT_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const WEEKDAYS_SHORT_PT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export function atNoon(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
}

export function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

/** Soma meses preservando o dia (limitado ao último dia do mês de destino). */
export function addMonths(d: Date, n: number) {
  const y = d.getFullYear();
  const m = d.getMonth() + n;
  const target = new Date(y, m, 1, d.getHours(), d.getMinutes());
  target.setDate(Math.min(d.getDate(), daysInMonth(target.getFullYear(), target.getMonth())));
  return target;
}

export function dateAtDay(year: number, month: number, day: number) {
  const ref = new Date(year, month, 1, 12);
  ref.setDate(Math.min(day, daysInMonth(ref.getFullYear(), ref.getMonth())));
  return ref;
}

export function toDateInput(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateInput(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthKeyAdd(key: string, n: number) {
  const [y, m] = key.split("-").map(Number);
  return monthKey(new Date(y, m - 1 + n, 1));
}

export function monthKeyLabel(key: string, short = false) {
  const [y, m] = key.split("-").map(Number);
  return short ? `${MONTHS_SHORT_PT[m - 1]}/${String(y).slice(2)}` : `${MONTHS_PT[m - 1]} de ${y}`;
}

export interface DateRange {
  start: Date; // inclusivo
  end: Date; // exclusivo
}

/** Mês financeiro que contém `ref`, respeitando o dia de início escolhido pelo usuário. */
export function financialMonth(ref: Date, startDay = 1): DateRange {
  const day = Math.min(Math.max(startDay, 1), 28);
  let start = new Date(ref.getFullYear(), ref.getMonth(), day);
  if (ref < start) start = new Date(ref.getFullYear(), ref.getMonth() - 1, day);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, day);
  return { start, end };
}

export function shiftFinancialMonth(range: DateRange, n: number, startDay = 1): DateRange {
  const ref = new Date(range.start.getFullYear(), range.start.getMonth() + n, Math.min(Math.max(startDay, 1), 28));
  return financialMonth(ref, startDay);
}

export const PERIOD_PRESETS = ["today", "week", "month", "3months", "year", "custom"] as const;
export type PeriodPreset = (typeof PERIOD_PRESETS)[number];
export const PERIOD_LABELS: Record<PeriodPreset, string> = {
  today: "Hoje",
  week: "Esta semana",
  month: "Este mês",
  "3months": "Últimos 3 meses",
  year: "Este ano",
  custom: "Personalizado",
};

export function periodRange(preset: PeriodPreset, startDay = 1, from?: string, to?: string, now = new Date()): DateRange {
  const today = startOfDay(now);
  switch (preset) {
    case "today":
      return { start: today, end: addDays(today, 1) };
    case "week": {
      const dow = (today.getDay() + 6) % 7; // semana começando na segunda
      const start = addDays(today, -dow);
      return { start, end: addDays(start, 7) };
    }
    case "3months": {
      const cur = financialMonth(now, startDay);
      return { start: shiftFinancialMonth(cur, -2, startDay).start, end: cur.end };
    }
    case "year":
      return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear() + 1, 0, 1) };
    case "custom": {
      if (from && to && /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
        const s = startOfDay(parseDateInput(from));
        const e = addDays(startOfDay(parseDateInput(to)), 1);
        if (s < e) return { start: s, end: e };
      }
      return financialMonth(now, startDay);
    }
    case "month":
    default:
      return financialMonth(now, startDay);
  }
}

export function formatDateShort(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${String(date.getDate()).padStart(2, "0")} ${MONTHS_SHORT_PT[date.getMonth()]}`;
}

export function formatDateLong(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${date.getDate()} de ${MONTHS_PT[date.getMonth()]} de ${date.getFullYear()}`;
}

/** "Hoje", "Ontem" ou "qua, 24 set" — usado para agrupar a lista de transações. */
export function relativeDayLabel(d: Date | string, now = new Date()) {
  const date = startOfDay(typeof d === "string" ? new Date(d) : d);
  const diff = Math.round((startOfDay(now).getTime() - date.getTime()) / 86_400_000);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Ontem";
  if (diff === -1) return "Amanhã";
  const base = `${WEEKDAYS_SHORT_PT[date.getDay()]}, ${date.getDate()} ${MONTHS_SHORT_PT[date.getMonth()]}`;
  return date.getFullYear() === now.getFullYear() ? base : `${base} ${date.getFullYear()}`;
}

export function greeting(now = new Date()) {
  const h = now.getHours();
  if (h < 5) return "Boa noite";
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}
