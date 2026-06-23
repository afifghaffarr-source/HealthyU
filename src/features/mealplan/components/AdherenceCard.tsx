/**
 * AdherenceCard — Dashboard widget for meal plan adherence.
 * Shows: current week ring, streak, "X hari Y%" insight, link to /mealplan/week.
 */
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Flame, TrendingUp, TrendingDown, ChevronRight } from "lucide-react";
import {
  getAdherenceStats,
  getAdherenceStreak,
} from "@/features/mealplan/lib/mealplanAdherence.functions";
import { AdherenceRing } from "./AdherenceRing";
import { cn } from "@/lib/utils";

export function AdherenceCard() {
  const adherenceFn = useServerFn(getAdherenceStats);
  const streakFn = useServerFn(getAdherenceStreak);

  const startOfThisWeek = (() => {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    const day = d.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setUTCDate(d.getUTCDate() + diff);
    return d.toISOString().slice(0, 10);
  })();

  const { data: adherence } = useQuery({
    queryKey: ["mealplan", "adherence", startOfThisWeek],
    queryFn: () => adherenceFn({ data: { start_date: startOfThisWeek, days: 7 } }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: streak } = useQuery({
    queryKey: ["mealplan", "streak"],
    queryFn: () => streakFn({ data: { threshold: 80, lookback_days: 30 } }),
    staleTime: 5 * 60 * 1000,
  });

  // Don't render if no data yet
  if (!adherence || adherence.totals.planned_kcal === 0) {
    return (
      <Link
        to="/mealplan/week"
        className="block bg-card rounded-3xl p-4 outline-1 outline-black/5 active:scale-[0.98] transition"
      >
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-2xl bg-primary/10 grid place-items-center shrink-0">
            <TrendingUp className="size-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Buat meal plan mingguan</p>
            <p className="text-xs text-muted-foreground">AI akan susun menu + pantau adherence</p>
          </div>
          <ChevronRight className="size-4 text-muted-foreground" />
        </div>
      </Link>
    );
  }

  const pct = adherence.totals.adherence_pct;
  const streakDays = streak?.streak ?? 0;

  return (
    <Link
      to="/mealplan/week"
      className="block bg-card rounded-3xl p-4 outline-1 outline-black/5 space-y-3 active:scale-[0.98] transition"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-9 rounded-xl bg-primary/10 grid place-items-center">
            <TrendingUp className="size-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">Adherence minggu ini</p>
            <p className="text-[11px] text-muted-foreground">
              {Math.round(adherence.totals.actual_kcal).toLocaleString("id-ID")}/
              {Math.round(adherence.totals.planned_kcal).toLocaleString("id-ID")} kkal
            </p>
          </div>
        </div>
        <ChevronRight className="size-4 text-muted-foreground" />
      </div>

      <div className="flex items-center gap-3">
        <AdherenceRing pct={pct} size="md" label="adherence" />
        <div className="flex-1 space-y-1.5 text-xs">
          {streakDays >= 1 && (
            <div className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
              <Flame className="size-3.5" />
              {streakDays} hari streak
            </div>
          )}
          {adherence.best_day && (
            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="size-3" />
              <span>
                Terbaik: {formatShort(adherence.best_day.date)} ({adherence.best_day.adherence_pct}
                %)
              </span>
            </div>
          )}
          {adherence.worst_day && adherence.worst_day.date !== adherence.best_day?.date && (
            <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
              <TrendingDown className="size-3" />
              <span>
                Terendah: {formatShort(adherence.worst_day.date)} (
                {adherence.worst_day.adherence_pct}%)
              </span>
            </div>
          )}
          {adherence.by_meal_type.length > 0 && (
            <div className="text-[10px] text-muted-foreground pt-1">
              {adherence.by_meal_type
                .slice(0, 2)
                .map((m) => `${mealTypeLabel(m.meal_type)} ${m.adherence_pct}%`)
                .join(" · ")}
            </div>
          )}
        </div>
      </div>

      {pct < 60 && (
        <p className={cn("text-[11px] text-muted-foreground italic")}>
          💡 Tip: meal plan lebih realistis = adherence lebih tinggi.
        </p>
      )}
    </Link>
  );
}

function formatShort(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function mealTypeLabel(t: string): string {
  const map: Record<string, string> = {
    breakfast: "Sarapan",
    lunch: "Siang",
    dinner: "Malam",
    snack: "Snack",
  };
  return map[t] ?? t;
}
