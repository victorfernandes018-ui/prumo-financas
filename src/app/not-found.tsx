import Link from "next/link";
import { LogoMark } from "@/components/layout/logo";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <LogoMark size={44} />
      <h1 className="text-2xl font-semibold tracking-tight">Página não encontrada</h1>
      <p className="max-w-sm text-sm text-muted">O endereço que você acessou não existe ou foi movido.</p>
      <Link href="/dashboard" className="rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white">
        Voltar ao início
      </Link>
    </main>
  );
}
