import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { formatDuration, fastingStage } from "@/lib/health";

export function HeroStatsRow({
  totals,
  calTarget,
  fast,
  fastMs,
  fastHrs,
  fastPct,
}: {
  totals: { cal: number; p: number; c: number; f: number };
  calTarget: number;
  fast: { start_time: string; target_hours: number | string } | null | undefined;
  fastMs: number;
  fastHrs: number;
  fastPct: number;
}) {
  void totals;
  void calTarget;
  return (
    <Link
      to="/fasting"
      className="block bg-card p-4 rounded-3xl outline-1 outline-black/5 dark:outline-white/10 shadow-sm animate-fade-up"
      aria-live="polite"
    >
      <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Puasa</p>
      {fast ? (
        <div className="mt-1">
          <p className="text-2xl font-bold tabular-nums">{formatDuration(fastMs)}</p>
          <div className="h-1.5 w-full bg-mint rounded-full overflow-hidden mt-2">
            <div className="h-full bg-coral transition-all" style={{ width: `${fastPct}%` }} />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5 truncate">
            {fastingStage(fastHrs)}
          </p>
        </div>
      ) : (
        <div className="mt-1 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-semibold">Mulai puasa</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              16:8, OMAD, Ramadhan & lainnya
            </p>
          </div>
          <span className="text-xs font-semibold text-primary inline-flex items-center gap-1 shrink-0">
            Pilih <ArrowRight className="size-3" />
          </span>
        </div>
      )}
    </Link>
  );
}

export function MacroBreakdown({ totals }: { totals: { p: number; c: number; f: number } }) {
  const items = [
    { label: "Protein", value: totals.p, color: "bg-primary" },
    { label: "Karbo", value: totals.c, color: "bg-accent" },
    { label: "Lemak", value: totals.f, color: "bg-charcoal" },
  ];
  return (
    <div className="bg-card p-4 rounded-3xl outline-1 outline-black/5 shadow-sm grid grid-cols-3 gap-2 animate-fade-up">
      {items.map((m) => (
        <div key={m.label}>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
            {m.label}
          </p>
          <p className="text-lg font-bold tabular-nums">
            {Math.round(m.value)}
            <span className="text-xs font-medium text-muted-foreground">g</span>
          </p>
          <div className={`h-1 w-8 rounded-full mt-1 ${m.color}`} />
        </div>
      ))}
    </div>
  );
}
