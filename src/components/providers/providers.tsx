"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { ToastProvider } from "@/components/ui/toast";
import { ConfirmProvider } from "@/components/ui/confirm";
import { PwaRegister } from "@/components/pwa/pwa-register";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ToastProvider>
        <ConfirmProvider>
          {children}
          <PwaRegister />
        </ConfirmProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
