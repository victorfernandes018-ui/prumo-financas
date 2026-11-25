"use client";

import { useEffect } from "react";

/** Registra o service worker (só em produção, para não atrapalhar o hot reload). */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((e) => console.warn("[pwa] registro falhou", e));
  }, []);
  return null;
}
