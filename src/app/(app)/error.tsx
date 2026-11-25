"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-expense-soft text-2xl">😕</div>
      <h2 className="text-lg font-semibold">Não conseguimos carregar esta página</h2>
      <p className="mt-1 max-w-sm text-sm text-muted">Pode ter sido uma instabilidade momentânea. Seus dados estão seguros.</p>
      <Button className="mt-6" onClick={reset}><RefreshCw className="h-4 w-4" /> Tentar novamente</Button>
    </div>
  );
}
