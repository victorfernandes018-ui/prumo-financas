import type { OAuthProviderId } from "@/server/auth/oauth";

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
    <path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2-1.9 3.2-4.7 3.2-8Z" />
    <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1-3.7 1-2.8 0-5.2-1.9-6.1-4.5H2.2v2.8A11 11 0 0 0 12 23Z" />
    <path fill="#FBBC05" d="M5.9 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.2a11 11 0 0 0 0 9.8l3.7-2.8Z" />
    <path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.1 1.6l3.1-3.1A11 11 0 0 0 2.2 7.1l3.7 2.8C6.8 7.3 9.2 5.4 12 5.4Z" />
  </svg>
);
const AppleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
    <path d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9a4.8 4.8 0 0 0-3.8-2c-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9a5 5 0 0 0-4.2 2.6c-1.8 3.1-.5 7.7 1.3 10.2.8 1.2 1.8 2.6 3.1 2.5 1.2 0 1.7-.8 3.2-.8s1.9.8 3.2.8c1.3 0 2.2-1.2 3-2.4a10 10 0 0 0 1.4-2.8 4.3 4.3 0 0 1-2.1-4.2ZM13.9 5a4.4 4.4 0 0 0 1-3.2 4.5 4.5 0 0 0-2.9 1.5 4.2 4.2 0 0 0-1 3.1c1.1.1 2.2-.6 2.9-1.4Z" />
  </svg>
);

export function OAuthButtons({ enabled }: { enabled: OAuthProviderId[] }) {
  const providers = [
    { id: "google" as const, label: "Google", icon: <GoogleIcon /> },
    { id: "apple" as const, label: "Apple", icon: <AppleIcon /> },
  ];
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {providers.map((p) => {
        const on = enabled.includes(p.id);
        return (
          <a
            key={p.id}
            href={on ? `/api/v1/auth/oauth/${p.id}` : undefined}
            aria-disabled={!on}
            title={on ? `Continuar com ${p.label}` : "Em breve"}
            className={`flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-medium transition-colors ${on ? "hover:bg-subtle" : "cursor-not-allowed opacity-50"}`}
          >
            {p.icon}
            {p.label}
            {!on && <span className="rounded bg-subtle px-1 text-[10px] text-muted">em breve</span>}
          </a>
        );
      })}
    </div>
  );
}
