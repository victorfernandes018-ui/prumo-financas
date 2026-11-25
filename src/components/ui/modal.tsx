"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  hideClose?: boolean;
}

/** Diálogo acessível: centralizado no desktop, "bottom sheet" no celular. */
export function Modal({ open, onClose, title, description, children, footer, size = "md", hideClose }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        const list = [...focusables].filter((el) => !el.hasAttribute("disabled"));
        if (!list.length) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    // Foca o primeiro campo automaticamente (se nenhum autoFocus já tiver agido)
    requestAnimationFrame(() => {
      if (panelRef.current && !panelRef.current.contains(document.activeElement)) {
        panelRef.current.querySelector<HTMLElement>("[autofocus], input, select, textarea, button")?.focus();
      }
    });
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const widths = { sm: "sm:max-w-sm", md: "sm:max-w-lg", lg: "sm:max-w-2xl" };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 animate-fade-in bg-black/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        className={cn(
          "relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl border border-border bg-card shadow-pop",
          "animate-sheet-up sm:animate-scale-in sm:rounded-3xl",
          widths[size],
        )}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-border sm:hidden" aria-hidden />
        {(title || !hideClose) && (
          <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-1 sm:px-6 sm:pt-6">
            <div className="min-w-0">
              {title && <h2 className="text-lg font-semibold tracking-tight">{title}</h2>}
              {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
            </div>
            {!hideClose && (
              <button onClick={onClose} className="-mt-1 -mr-2 rounded-lg p-2 text-muted transition-colors hover:bg-subtle hover:text-foreground" aria-label="Fechar">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
        <div className="overflow-y-auto px-5 py-4 sm:px-6">{children}</div>
        {footer && <div className="pb-safe flex gap-2 border-t border-border px-5 py-4 sm:px-6">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
