"use client";

import { forwardRef } from "react";
import { maskMoneyDigits } from "@/lib/money";
import { cn } from "@/lib/utils";

const SYMBOLS: Record<string, string> = { BRL: "R$", USD: "US$", EUR: "€" };

interface MoneyInputProps {
  value: number; // centavos
  onChange: (cents: number) => void;
  currency?: string;
  size?: "md" | "hero";
  autoFocus?: boolean;
  id?: string;
  invalid?: boolean;
  className?: string;
  placeholder?: string;
  allowNegative?: boolean;
}

/** Campo de valor estilo caixa eletrônico: digitar "3500" vira "35,00". Ideal para teclado numérico no celular. */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  { value, onChange, currency = "BRL", size = "md", autoFocus, id, invalid, className, allowNegative },
  ref,
) {
  const negative = value < 0;
  const display = maskMoneyDigits(String(Math.abs(value))).display;
  const symbol = SYMBOLS[currency] ?? currency;

  if (size === "hero") {
    return (
      <div className={cn("flex items-baseline justify-center gap-2", className)}>
        <span className="text-2xl font-medium text-muted">{symbol}</span>
        <input
          ref={ref}
          id={id}
          inputMode="numeric"
          autoFocus={autoFocus}
          aria-label="Valor"
          aria-invalid={invalid}
          value={display}
          onChange={(e) => onChange(maskMoneyDigits(e.target.value).cents)}
          style={{ width: `${Math.max(display.length, 4) * 0.62}em` }}
          className="tabular max-w-full bg-transparent text-left text-5xl font-semibold tracking-tight outline-none sm:text-6xl"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-11 items-center rounded-xl border border-border bg-card px-3.5 transition-colors focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10",
        invalid && "border-danger",
        className,
      )}
    >
      {allowNegative && (
        <button
          type="button"
          onClick={() => onChange(-value)}
          className="mr-1.5 rounded-md bg-subtle px-1.5 text-xs font-semibold text-muted"
          aria-label="Alternar sinal"
        >
          {negative ? "−" : "+"}
        </button>
      )}
      <span className="mr-2 text-sm text-muted">{symbol}</span>
      <input
        ref={ref}
        id={id}
        inputMode="numeric"
        autoFocus={autoFocus}
        aria-invalid={invalid}
        value={display}
        onChange={(e) => {
          const cents = maskMoneyDigits(e.target.value).cents;
          onChange(negative ? -cents : cents);
        }}
        className="tabular h-full w-full bg-transparent text-sm font-medium outline-none"
      />
    </div>
  );
});
