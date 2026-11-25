"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Button } from "./button";
import { Modal } from "./modal";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
}

const ConfirmContext = createContext<((o: ConfirmOptions) => Promise<boolean>) | null>(null);

/** `const ok = await confirm({ title: "Excluir?" })` — substitui o window.confirm com um modal bonito. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<(v: boolean) => void>(() => {});

  const confirm = useCallback((o: ConfirmOptions) => {
    setOpts(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (v: boolean) => {
    resolver.current(v);
    setOpts(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={!!opts}
        onClose={() => close(false)}
        title={opts?.title}
        description={opts?.description}
        size="sm"
        footer={
          <>
            <Button variant="secondary" className="flex-1" onClick={() => close(false)}>
              Cancelar
            </Button>
            <Button variant={opts?.danger ? "danger" : "primary"} className="flex-1" onClick={() => close(true)} autoFocus>
              {opts?.confirmLabel ?? "Confirmar"}
            </Button>
          </>
        }
      >
        <span className="sr-only">Confirmação</span>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm precisa estar dentro de <ConfirmProvider>");
  return ctx;
}
