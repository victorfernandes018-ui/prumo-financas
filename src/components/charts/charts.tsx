"use client";

import { useMemo, useState } from "react";
import {
  Area, Bar, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export const SERIES = {
  income: { label: "Receitas", color: "var(--income)" },
  expense: { label: "Despesas", color: "var(--expense)" },
  balance: { label: "Saldo", color: "var(--balance)" },
} as const;
type SeriesKey = keyof typeof SERIES;

export interface FlowPoint {
  label: string;
  income: number;
  expense: number;
  balance: number | null;
}

const compactAxis = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });
/** Rótulo curto para o eixo Y ("7,5 mil"); o valor completo aparece no tooltip. */
const axisMoney = (cents: number) => compactAxis.format(cents / 100);

const axisProps = {
  tickLine: false,
  axisLine: false,
  tick: { fill: "var(--muted)", fontSize: 11 },
} as const;

export function ChartLegend({ keys, className }: { keys: SeriesKey[]; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-1", className)}>
      {keys.map((k) => (
        <span key={k} className="flex items-center gap-1.5 text-xs text-muted">
          <span className={cn("inline-block", k === "balance" ? "h-0.5 w-3.5 rounded" : "h-2.5 w-2.5 rounded-[3px]")} style={{ background: SERIES[k].color }} />
          {SERIES[k].label}
        </span>
      ))}
    </div>
  );
}

interface TooltipContentProps {
  active?: boolean;
  payload?: { dataKey?: string | number | ((o: unknown) => unknown); value?: number | string | null }[];
  label?: string | number;
  currency: string;
}

function FlowTooltip({ active, payload, label, currency }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[170px] rounded-xl border border-border bg-card/95 px-3 py-2.5 shadow-pop backdrop-blur">
      <p className="mb-1.5 text-xs font-medium text-muted">{label}</p>
      {payload
        .filter((p) => p.value !== null && p.value !== undefined)
        .map((p) => {
          const key = String(p.dataKey).replace("cum_", "") as SeriesKey;
          return (
            <div key={String(p.dataKey)} className="flex items-center justify-between gap-4 py-0.5 text-[13px]">
              <span className="flex items-center gap-1.5 text-muted">
                <span className="h-2 w-2 rounded-full" style={{ background: SERIES[key]?.color }} />
                {SERIES[key]?.label}
              </span>
              <span className="tabular font-semibold text-foreground">{formatMoney(Number(p.value), currency)}</span>
            </div>
          );
        })}
    </div>
  );
}

/**
 * Evolução financeira.
 * - "bars": receitas e despesas por período (barras) + saldo (linha) — visão anual.
 * - "cumulative": receitas e despesas acumuladas no período + saldo — visão semanal/mensal.
 * Todas as séries estão na mesma unidade (moeda), então um único eixo Y.
 */
export function FlowChart({ data, mode = "bars", currency = "BRL", height = 260 }: { data: FlowPoint[]; mode?: "bars" | "cumulative"; currency?: string; height?: number }) {
  const rows = useMemo(() => {
    if (mode === "bars") return data;
    let inc = 0;
    let exp = 0;
    return data.map((d) => {
      inc += d.income;
      exp += d.expense;
      return { ...d, cum_income: d.balance === null ? null : inc, cum_expense: d.balance === null ? null : exp };
    });
  }, [data, mode]);

  const interval = data.length > 16 ? Math.ceil(data.length / 8) - 1 : 0;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={rows} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barGap={2} barCategoryGap="28%">
        <defs>
          <linearGradient id="balance-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--balance)" stopOpacity={0.18} />
            <stop offset="100%" stopColor="var(--balance)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="0" />
        <XAxis dataKey="label" {...axisProps} interval={interval} dy={6} />
        <YAxis {...axisProps} width={48} tickFormatter={axisMoney} />
        <Tooltip content={<FlowTooltip currency={currency} />} cursor={mode === "bars" ? { fill: "var(--subtle)" } : { stroke: "var(--muted)", strokeWidth: 1, strokeDasharray: "3 3" }} />
        {mode === "bars" ? (
          <>
            <Bar dataKey="income" fill="var(--income)" radius={[4, 4, 0, 0]} maxBarSize={22} />
            <Bar dataKey="expense" fill="var(--expense)" radius={[4, 4, 0, 0]} maxBarSize={22} />
          </>
        ) : (
          <>
            <Line dataKey="cum_income" stroke="var(--income)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }} connectNulls={false} />
            <Line dataKey="cum_expense" stroke="var(--expense)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }} connectNulls={false} />
          </>
        )}
        <Area dataKey="balance" stroke="var(--balance)" strokeWidth={2} fill="url(#balance-fill)" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }} connectNulls={false} type="monotone" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/** Barras agrupadas receitas × despesas (comparação mensal). */
export function IncomeExpenseBars({ data, currency = "BRL", height = 240 }: { data: FlowPoint[]; currency?: string; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barGap={2} barCategoryGap="30%">
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" {...axisProps} dy={6} />
        <YAxis {...axisProps} width={48} tickFormatter={axisMoney} />
        <Tooltip content={<FlowTooltip currency={currency} />} cursor={{ fill: "var(--subtle)" }} />
        <Bar dataKey="income" fill="var(--income)" radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar dataKey="expense" fill="var(--expense)" radius={[4, 4, 0, 0]} maxBarSize={28} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/** Linha única (ex.: evolução do patrimônio). Série única dispensa legenda. */
export function BalanceLine({ data, currency = "BRL", height = 220 }: { data: { label: string; balance: number | null }[]; currency?: string; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="patrimony-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--balance)" stopOpacity={0.2} />
            <stop offset="100%" stopColor="var(--balance)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" {...axisProps} dy={6} />
        <YAxis {...axisProps} width={48} tickFormatter={axisMoney} domain={["auto", "auto"]} />
        <Tooltip content={<FlowTooltip currency={currency} />} cursor={{ stroke: "var(--muted)", strokeWidth: 1, strokeDasharray: "3 3" }} />
        <Area dataKey="balance" type="monotone" stroke="var(--balance)" strokeWidth={2} fill="url(#patrimony-fill)" dot={{ r: 3, fill: "var(--balance)", strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)" }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export interface DonutSlice {
  id: string;
  name: string;
  icon: string;
  color: string;
  amount: number;
  percent: number;
}

/** Agrupa as fatias além da 7ª em "Outros" (nunca gerar cores novas). */
export function foldSlices(slices: DonutSlice[], max = 7): DonutSlice[] {
  if (slices.length <= max) return slices;
  const head = slices.slice(0, max - 1);
  const tail = slices.slice(max - 1);
  return [
    ...head,
    {
      id: "__others",
      name: "Demais categorias",
      icon: "➕",
      color: "#94a3b8",
      amount: tail.reduce((s, x) => s + x.amount, 0),
      percent: tail.reduce((s, x) => s + x.percent, 0),
    },
  ];
}

/** Donut de categorias. Clicar numa fatia seleciona a categoria. */
export function DonutChart({
  data,
  total,
  currency = "BRL",
  selected,
  onSelect,
  size = 200,
  centerLabel = "Total",
}: {
  data: DonutSlice[];
  total: number;
  currency?: string;
  selected?: string | null;
  onSelect?: (id: string | null) => void;
  size?: number;
  centerLabel?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const focus = hover !== null ? data[hover] : selected ? data.find((d) => d.id === selected) : null;

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="amount"
            nameKey="name"
            innerRadius="68%"
            outerRadius="100%"
            paddingAngle={data.length > 1 ? 2 : 0}
            cornerRadius={4}
            stroke="var(--card)"
            strokeWidth={2}
            startAngle={90}
            endAngle={-270}
            onMouseEnter={(_, i) => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onClick={(_, i) => onSelect?.(data[i].id === selected ? null : data[i].id)}
            isAnimationActive
            animationDuration={700}
          >
            {data.map((d) => (
              <Cell
                key={d.id}
                fill={d.color}
                className="cursor-pointer outline-none transition-opacity"
                opacity={selected && selected !== d.id ? 0.3 : 1}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[11px] font-medium text-muted">{focus ? `${focus.icon} ${focus.name}` : centerLabel}</span>
        <span className="tabular text-lg font-semibold tracking-tight">{formatMoney(focus ? focus.amount : total, currency)}</span>
        {focus && <span className="text-[11px] text-muted">{focus.percent.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</span>}
      </div>
    </div>
  );
}
