"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { ApiClientError } from "./api-client";

/** Executa uma mutação com loading, erros por campo, toast e refresh dos dados do servidor. */
export function useMutation() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function run<T>(fn: () => Promise<T>, opts: { success?: string; successDescription?: string; errorTitle?: string } = {}): Promise<T | undefined> {
    setLoading(true);
    setErrors({});
    try {
      const result = await fn();
      if (opts.success) toast.success(opts.success, opts.successDescription);
      router.refresh();
      return result;
    } catch (e) {
      if (e instanceof ApiClientError) {
        setErrors(e.fields);
        toast.error(opts.errorTitle ?? "Não foi possível concluir", e.message);
      } else toast.error("Algo deu errado");
      return undefined;
    } finally {
      setLoading(false);
    }
  }

  return { run, loading, errors, setErrors };
}
