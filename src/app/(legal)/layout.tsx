import Link from "next/link";
import { Logo } from "@/components/layout/logo";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-6">
        <Link href="/"><Logo /></Link>
        <Link href="/login" className="text-sm font-medium text-brand hover:underline">Entrar</Link>
      </header>
      <main className="mx-auto max-w-3xl px-5 pb-16">
        <article className="space-y-4 rounded-2xl border border-border bg-card p-6 text-[15px] leading-relaxed text-foreground/85 sm:p-10 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:text-foreground [&_h2]:pt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
          {children}
        </article>
      </main>
    </div>
  );
}
