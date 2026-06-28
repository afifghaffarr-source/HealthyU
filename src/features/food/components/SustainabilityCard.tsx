import { Leaf, Drumstick, AlertTriangle, Sprout } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SustainabilitySummary } from "@/features/food/lib/sustainability";

/**
 * Sprint 30 — Sustainability Card visual.
 *
 * Gradient ring + classification chip + top contributors list + tip.
 * Mirrors HealthScoreCard and ActiveFastCard visual language.
 */

const CLASS_CFG: Record<
  SustainabilitySummary["classification"],
  { label: string; cls: string; Icon: typeof Leaf; desc: string }
> = {
  low: {
    label: "Rendah",
    cls: "text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border-emerald-500/30",
    Icon: Sprout,
    desc: "Pola makan Anda rendah jejak karbon minggu ini 🌱",
  },
  medium: {
    label: "Sedang",
    cls: "text-amber-700 dark:text-amber-300 bg-amber-500/15 border-amber-500/30",
    Icon: Leaf,
    desc: "Ada beberapa sumber emisi, masih dalam batas wajar.",
  },
  high: {
    label: "Tinggi",
    cls: "text-rose-700 dark:text-rose-300 bg-rose-500/15 border-rose-500/30",
    Icon: AlertTriangle,
    desc: "Minggu ini banyak protein hewani — coba ganti satu menu.",
  },
};

export function SustainabilityCard({ data }: { data: SustainabilitySummary }) {
  const cfg = CLASS_CFG[data.classification];
  const { Icon } = cfg;
  const matchedPct =
    data.matchedCount + data.unmatchedCount > 0
      ? Math.round((data.matchedCount / (data.matchedCount + data.unmatchedCount)) * 100)
      : 0;

  return (
    <section
      className="rounded-2xl bg-card border border-border/50 p-4 space-y-3"
      data-testid="sustainability-card"
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Leaf className="size-3" />
        Jejak Karbon — Minggu Ini
      </div>

      <div className="flex items-start gap-4">
        <div
          className={cn(
            "size-14 shrink-0 rounded-xl grid place-items-center border font-bold text-xl tabular-nums",
            cfg.cls,
          )}
          style={{ fontFamily: "var(--font-display)" }}
        >
          <Icon className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-3xl font-bold tabular-nums">
            {data.totalKgCo2e.toFixed(1)}
            <span className="text-base text-muted-foreground font-medium ml-1">kg CO₂e</span>
          </div>
          <p className="text-sm mt-0.5">
            <span className={cn("font-semibold px-1.5 py-0.5 rounded text-xs", cfg.cls)}>
              {cfg.label}
            </span>
            <span className="ml-2 text-muted-foreground">{cfg.desc}</span>
          </p>
        </div>
      </div>

      {data.topMatches.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Kontributor terbesar
          </div>
          <ul className="space-y-1">
            {data.topMatches.map((m) => (
              <li key={m.label} className="flex justify-between text-xs">
                <span className="inline-flex items-center gap-1">
                  <Drumstick className="size-3" /> {m.label}
                </span>
                <span className="font-semibold tabular-nums">{m.kgCo2e.toFixed(1)} kg</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-[12px] leading-snug">
        💡 {data.tip}
      </div>

      {data.matchedCount + data.unmatchedCount > 0 && (
        <p className="text-[10px] text-muted-foreground tabular-nums">
          {matchedPct}% dari makanan minggu ini berhasil dianalisis ({data.matchedCount}/
          {data.matchedCount + data.unmatchedCount}).
        </p>
      )}
    </section>
  );
}
