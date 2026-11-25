"use client";

import Link from "next/link";
import { CheckCircle2, Info, Lightbulb, TriangleAlert, XCircle } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, Progress } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import type { HealthReport, IndicatorStatus } from "@/server/services/health";

const STATUS: Record<IndicatorStatus, { icon: React.ElementType; cls: string; label: string }> = {
  good: { icon: CheckCircle2, cls: "text-income", label: "Saudável" },
  warning: { icon: TriangleAlert, cls: "text-warning", label: "Atenção" },
  bad: { icon: XCircle, cls: "text-expense", label: "Crítico" },
  neutral: { icon: Info, cls: "text-muted", label: "Informativo" },
};

function ScoreGauge({ score, level }: { score: number; level: string }) {
  const r = 80;
  const c = Math.PI * r;
  const color = level === "excellent" || level === "good" ? "var(--income)" : level === "attention" ? "var(--warning)" : "var(--expense)";
  return (
    <svg viewBox="0 0 200 116" className="w-full max-w-[260px]" role="img" aria-label={`Organização financeira: ${score} de 100`}>
      <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="var(--subtle)" strokeWidth="14" strokeLinecap="round" />
      <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke={color} strokeWidth="14" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (score / 100) * c} style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)" }} />
      <text x="100" y="88" textAnchor="middle" className="fill-foreground" style={{ fontSize: 40, fontWeight: 700 }}>{score}</text>
      <text x="100" y="108" textAnchor="middle" className="fill-[var(--muted)]" style={{ fontSize: 11 }}>de 100</text>
    </svg>
  );
}

export function HealthView({ report }: { report: HealthReport }) {
  if (!report.hasData) {
    return (
      <div>
        <PageHeader title="Saúde financeira" />
        <Card><EmptyState icon="🌱" title={report.label} description={report.message} action={<Link href="/transactions"><Button>Registrar transações</Button></Link>} /></Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Saúde financeira" description="Uma análise da sua organização com base nos seus lançamentos." />

      <div className="mb-6 grid gap-4 lg:grid-cols-5">
        <Card className="flex flex-col items-center p-6 text-center lg:col-span-2">
          <p className="text-sm font-medium text-muted">Sua saúde financeira</p>
          <p className="mt-1 text-2xl font-semibold">{report.emoji} {report.label}</p>
          <div className="mt-4 w-full"><ScoreGauge score={report.score} level={report.level} /></div>
          <p className="text-sm font-semibold">Organização financeira: {report.score}/100</p>
          <p className="mt-3 max-w-sm text-sm text-muted">“{report.message}”</p>
          <p className="mt-4 rounded-lg bg-subtle px-3 py-2 text-[11px] leading-relaxed text-muted">
            Esta pontuação é um indicador interno do Prumo sobre a sua organização financeira. <b>Não é score de crédito</b> e não é compartilhada com ninguém.
          </p>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader title="Como a pontuação é calculada" />
          <div className="space-y-4 p-5">
            {report.breakdown.map((b) => (
              <div key={b.label}>
                <div className="mb-1.5 flex justify-between text-[13px]"><span className="font-medium">{b.label}</span><span className="tabular text-muted"><b className="text-foreground">{b.points}</b> / {b.max} pts</span></div>
                <Progress value={(b.points / b.max) * 100} tone={b.points / b.max >= 0.7 ? "ok" : b.points / b.max >= 0.4 ? "warning" : "exceeded"} color="var(--income)" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <h2 className="mb-3 text-[15px] font-semibold">Indicadores</h2>
      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {report.indicators.map((i) => {
          const s = STATUS[i.status];
          return (
            <Card key={i.key} className="p-5">
              <div className="flex items-start justify-between">
                <p className="text-[13px] font-medium text-muted">{i.label}</p>
                <span className={cn("flex items-center gap-1 text-[11px] font-semibold", s.cls)}><s.icon className="h-3.5 w-3.5" />{s.label}</span>
              </div>
              <p className="tabular mt-2 text-2xl font-semibold tracking-tight">{i.value}</p>
              {i.percent !== undefined && <Progress value={i.percent} className="mt-3 h-1.5" color={i.status === "good" ? "var(--income)" : i.status === "warning" ? "var(--warning)" : i.status === "bad" ? "var(--expense)" : "var(--brand)"} />}
              <p className="mt-3 text-xs leading-relaxed text-muted">{i.description}</p>
            </Card>
          );
        })}
      </div>

      <Card className="p-5">
        <p className="mb-3 flex items-center gap-2 text-[15px] font-semibold"><Lightbulb className="h-4 w-4 text-warning" /> Recomendações para você</p>
        <ul className="space-y-2.5">
          {report.tips.map((t) => <li key={t} className="flex gap-2.5 text-sm"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />{t}</li>)}
        </ul>
      </Card>
    </div>
  );
}
