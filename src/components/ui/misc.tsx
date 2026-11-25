import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn, initials } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-xl", className)} aria-hidden />;
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "brand" | "income" | "expense" | "warning";
  className?: string;
}) {
  const tones = {
    neutral: "bg-subtle text-muted",
    brand: "bg-brand-soft text-brand",
    income: "bg-income-soft text-income",
    expense: "bg-expense-soft text-expense",
    warning: "bg-warning-soft text-warning",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", tones[tone], className)}>{children}</span>;
}

export function Progress({ value, color, className, tone }: { value: number; color?: string; className?: string; tone?: "ok" | "warning" | "exceeded" }) {
  const toneColor = tone === "exceeded" ? "var(--expense)" : tone === "warning" ? "var(--warning)" : undefined;
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-subtle", className)} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out"
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%`, background: toneColor ?? color ?? "var(--brand)" }}
      />
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex animate-fade-in flex-col items-center justify-center px-6 py-12 text-center", className)}>
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-2xl text-brand">{icon}</div>
      <h3 className="text-[15px] font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function IconBubble({ icon, color, size = "md", className }: { icon: ReactNode; color: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const sizes = { sm: "h-8 w-8 text-sm rounded-lg", md: "h-10 w-10 text-lg rounded-xl", lg: "h-12 w-12 text-xl rounded-2xl" };
  return (
    <div className={cn("flex shrink-0 items-center justify-center", sizes[size], className)} style={{ background: `color-mix(in srgb, ${color} 14%, transparent)` }}>
      <span aria-hidden>{icon}</span>
    </div>
  );
}

/** Variação percentual. `inverse` = para despesas, subir é ruim. */
export function Trend({ value, inverse, suffix = "vs. mês passado", className }: { value: number | null; inverse?: boolean; suffix?: string; className?: string }) {
  if (value === null || !Number.isFinite(value)) return <span className={cn("text-xs text-muted", className)}>Sem comparação anterior</span>;
  if (Math.abs(value) < 0.05) return <span className={cn("inline-flex items-center gap-1 text-xs text-muted", className)}><span className="rounded-full bg-subtle px-1.5 py-0.5 font-semibold">0%</span>{suffix}</span>;
  const up = value > 0;
  const good = inverse ? !up : up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs", className)}>
      <span className={cn("inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold", good ? "bg-income-soft text-income" : "bg-expense-soft text-expense")}>
        <Icon className="h-3 w-3" aria-hidden />
        {up ? "+" : ""}
        {value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
      </span>
      <span className="text-muted">{suffix}</span>
    </span>
  );
}

export function Avatar({ name, src, size = 36, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  return (
    <div
      className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand to-violet-400 font-semibold text-white", className)}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt={name} className="h-full w-full object-cover" /> : initials(name)}
    </div>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  size = "md",
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div className={cn("inline-flex rounded-xl bg-subtle p-1", className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 rounded-lg font-medium whitespace-nowrap transition-all",
            size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-[13px]",
            value === o.value ? "bg-card text-foreground shadow-sm" : "text-muted hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label, id }: { checked: boolean; onChange: (v: boolean) => void; label?: string; id?: string }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn("relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors", checked ? "bg-brand" : "bg-border")}
    >
      <span className={cn("inline-block h-5 w-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-[22px]" : "translate-x-0.5")} />
    </button>
  );
}
