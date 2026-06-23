import { Link } from "@tanstack/react-router";
import { Droplets, Flame, Beef, Wheat } from "lucide-react";

type Stat = {
  label: string;
  value: string;
  unit: string;
  pct: number;
  Icon: typeof Droplets;
  tone: "primary" | "blue" | "amber" | "rose";
  href?: string;
};

const TONE_BG = {
  primary: "bg-primary/10 text-primary",
  blue: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
  amber: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
  rose: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300",
} as const;

/**
 * QuickStatsGrid — 4 mobile-first tiles for fast daily health glance.
 *
 * Order: Calories (primary) · Water · Protein · Carbs.
 * Each tile shows progress bar + value/unit + label.
 * On click → navigates to relevant detail page.
 */
export function QuickStatsGrid({
  totals,
  calTarget,
  waterMl,
  waterTarget,
}: {
  totals: { cal: number; p: number; c: number; f: number };
  calTarget: number;
  waterMl: number;
  waterTarget: number;
}) {
  const calPct = Math.min(100, Math.round((totals.cal / calTarget) * 100));
  const waterPct = Math.min(100, Math.round((waterMl / waterTarget) * 100));
  // AKG: protein 60g, carbs 300g
  const proteinTarget = 60;
  const carbsTarget = 300;
  const proteinPct = Math.min(100, Math.round((totals.p / proteinTarget) * 100));
  const carbsPct = Math.min(100, Math.round((totals.c / carbsTarget) * 100));

  const stats: Stat[] = [
    {
      label: "Kalori",
      value: Math.round(totals.cal).toString(),
      unit: `/${calTarget}`,
      pct: calPct,
      Icon: Flame,
      tone: "primary",
      href: "/food",
    },
    {
      label: "Air",
      value: waterMl.toString(),
      unit: `/${waterTarget}ml`,
      pct: waterPct,
      Icon: Droplets,
      tone: "blue",
      href: "/water",
    },
    {
      label: "Protein",
      value: Math.round(totals.p).toString(),
      unit: `/${proteinTarget}g`,
      pct: proteinPct,
      Icon: Beef,
      tone: "rose",
    },
    {
      label: "Karbo",
      value: Math.round(totals.c).toString(),
      unit: `/${carbsTarget}g`,
      pct: carbsPct,
      Icon: Wheat,
      tone: "amber",
    },
  ];

  return (
    <section
      aria-label="Statistik cepat hari ini"
      className="grid grid-cols-2 gap-2 animate-fade-up"
    >
      {stats.map(({ label, value, unit, pct, Icon, tone, href }) => {
        const tile = (
          <div className="bg-card p-3.5 rounded-2xl outline-1 outline-black/5 dark:outline-white/10 hover:bg-secondary/20 active:scale-[0.98] transition min-h-11">
            <div className="flex items-center justify-between mb-2">
              <div className={`size-7 rounded-lg grid place-items-center ${TONE_BG[tone]}`}>
                <Icon className="size-3.5" aria-hidden />
              </div>
              <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">
                {pct}%
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold tabular-nums leading-none">{value}</span>
              <span className="text-[10px] text-muted-foreground">{unit}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 font-medium">{label}</p>
            <div className="h-1 w-full bg-muted/40 rounded-full overflow-hidden mt-2">
              <div
                className={`h-full transition-all ${
                  tone === "primary"
                    ? "bg-primary"
                    : tone === "blue"
                      ? "bg-blue-500"
                      : tone === "amber"
                        ? "bg-amber-500"
                        : "bg-rose-500"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
        if (href) {
          return (
            <Link key={label} to={href} className="block">
              {tile}
            </Link>
          );
        }
        return <div key={label}>{tile}</div>;
      })}
    </section>
  );
}
