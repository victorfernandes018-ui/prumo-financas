"use client";

import { Check } from "lucide-react";
import { PALETTE } from "@/lib/constants";

export function ColorPicker({ value, onChange, colors = PALETTE }: { value: string; onChange: (c: string) => void; colors?: string[] }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cor">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          aria-label={c}
          onClick={() => onChange(c)}
          className="flex h-8 w-8 items-center justify-center rounded-full transition-transform hover:scale-110"
          style={{ background: c }}
        >
          {value === c && <Check className="h-4 w-4 text-white" />}
        </button>
      ))}
    </div>
  );
}
