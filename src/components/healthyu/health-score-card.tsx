import { cn } from "@/lib/utils";
import { Heart } from "lucide-react";

export interface HealthScoreFactor {
  label: string;
  value: number; // 0..100
}

interface Props {
  factors: HealthScoreFactor[];
  className?: string;
}

/**
 * Composite health score (0-100) derived from weighted equal-average of factors.
 * Renders a large gradient ring + factor bars.
 */
export function HealthScoreCard({ factors, className }: Props) {
  const score = factors.length
    ? Math.round(factors.reduce((s, f) => s + clamp(f.value), 0) / factors.length)
    : 0;
  const tone = score >= 80 ? "text-success" : score >= 60 ? "text-primary" : score >= 40 ? "text-warning" : "text-error";
  const label = score >= 80 ? "Sangat Baik" : score >= 60 ? "Baik" : score >= 40 ? "Cukup" : "Perlu Perhatian";
  const r = 46;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - score / 100);

  return (
    <div className={cn("rounded-3xl bg-card border border-border/60 p-5 shadow-[var(--shadow-elev-1)]", className)}>
      <div className="flex items-center gap-4">
        <div className="relative size-28 shrink-0">
          <svg viewBox="0 0 100 100" className="-rotate-90 block size-full">
            <defs>
              <linearGradient id="hs-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--primary)" />
                <stop offset="100%" stopColor="var(--accent)" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r={r} fill="none" strokeWidth="7" className="stroke-muted" />
            <circle
              cx="50" cy="50" r={r} fill="none" strokeWidth="7"
              stroke="url(#hs-grad)" strokeLinecap="round"
              strokeDasharray={c} strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 800ms ease" }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <div className={cn("text-3xl font-bold tabular-nums", tone)} style={{ fontFamily: "var(--font-display)" }}>{score}</div>
              <div className="text-[10px] text-muted-foreground -mt-1">/ 100</div>
            </div>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
            <Heart className="size-3" /> Health Score
          </div>
          <p className={cn("font-bold text-lg mt-0.5", tone)} style={{ fontFamily: "var(--font-display)" }}>{label}</p>
          <p className="text-xs text-muted-foreground mt-1">Dihitung dari {factors.length} faktor harian.</p>
        </div>
      </div>
      <ul className="mt-4 space-y-2">
        {factors.map((f) => {
          const v = clamp(f.value);
          return (
            <li key={f.label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">{f.label}</span>
                <span className="font-semibold tabular-nums">{v}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-[width] duration-700"
                  style={{ width: `${v}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}