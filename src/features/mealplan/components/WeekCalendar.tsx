/**
 * WeekCalendar — 7-day scrollable calendar view.
 * - Default: shows current week (today + 6 days)
 * - Wires swapMeal, getAdherenceStats
 * - Top action bar: prev/next week, jump to today, duplicate last week, copy to today
 *
 * Designed for mobile-first: vertical scroll, each day a card.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Sparkles,
  Loader2,
  Calendar,
  TrendingUp,
} from "lucide-react";
import {
  swapMeal,
  getAdherenceStats,
  getAdherenceStreak,
  duplicateLastWeek,
} from "@/features/mealplan/lib/mealplanAdherence.functions";
import { weekPlan } from "@/features/mealplan/lib/mealplan.functions";
import { DayPlanCard } from "./DayPlanCard";
import { AdherenceRing } from "./AdherenceRing";
import { toast } from "@/lib/toast-config";
import { toastError } from "@/lib/toast-config";
import { cn } from "@/lib/utils";

type DayMeal = {
  id: string;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  custom_name: string | null;
  calories: number;
  confidence?: string | null;
  swapped_from_id?: string | null;
  note?: string | null;
};

type DayPlan = {
  date: string;
  dayLabel: string;
  isToday: boolean;
  meals: DayMeal[];
  actualKcal: number;
};

const DAY_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  // ISO week starts Monday; for Indonesian context use Monday
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day; // Sunday=0, Monday=1
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function WeekCalendar() {
  const qc = useQueryClient();
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [swappingId, setSwappingId] = useState<string | null>(null);

  const today = isoDate(new Date());
  const weekEnd = addDays(weekStart, 7);
  const weekStartStr = isoDate(weekStart);
  const weekEndStr = isoDate(weekEnd);

  const swapFn = useServerFn(swapMeal);
  const weekFn = useServerFn(weekPlan);
  const adherenceFn = useServerFn(getAdherenceStats);
  const streakFn = useServerFn(getAdherenceStreak);
  const dupFn = useServerFn(duplicateLastWeek);

  const { data: plan, isLoading: planLoading } = useQuery({
    queryKey: ["mealplan", "week", weekStartStr],
    queryFn: () => weekFn({ data: { start_date: weekStartStr } }),
  });

  const { data: adherence, isLoading: adherenceLoading } = useQuery({
    queryKey: ["mealplan", "adherence", weekStartStr],
    queryFn: () => adherenceFn({ data: { start_date: weekStartStr, days: 7 } }),
  });

  const { data: streak } = useQuery({
    queryKey: ["mealplan", "streak"],
    queryFn: () => streakFn({ data: { threshold: 80, lookback_days: 30 } }),
  });

  const swapMut = useMutation({
    mutationFn: (planId: string) => swapFn({ data: { plan_id: planId } }),
    onMutate: (planId) => setSwappingId(planId),
    onSettled: () => setSwappingId(null),
    onSuccess: () => {
      toast.success("Meal di-swap");
      qc.invalidateQueries({ queryKey: ["mealplan", "week", weekStartStr] });
    },
    onError: (e) => toastError(e, "Gagal swap"),
  });

  const dupMut = useMutation({
    mutationFn: () => dupFn({ data: undefined }),
    onSuccess: (r: { inserted: number }) => {
      toast.success(`${r.inserted} meal dicopy dari minggu lalu`);
      qc.invalidateQueries({ queryKey: ["mealplan"] });
    },
    onError: (e) => toastError(e, "Gagal duplikasi"),
  });

  // Build 7-day structure
  const days: DayPlan[] = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    const dateStr = isoDate(d);
    const dayMeals = ((plan ?? []) as DayMeal[]).filter(
      (m) => (m as unknown as { plan_date: string }).plan_date === dateStr,
    );
    const actual = adherence?.days.find((x) => x.date === dateStr)?.actual_kcal ?? 0;
    return {
      date: dateStr,
      dayLabel: DAY_LABELS[d.getUTCDay()],
      isToday: dateStr === today,
      meals: dayMeals,
      actualKcal: actual,
    };
  });

  const isCurrentWeek = weekStartStr === isoDate(startOfWeek(new Date()));
  const totalPlanned = days.reduce(
    (s, d) => s + d.meals.reduce((ss, m) => ss + Number(m.calories ?? 0), 0),
    0,
  );
  const totalActual = adherence?.totals.actual_kcal ?? 0;
  const overallAdherence =
    adherence?.totals.adherence_pct ??
    (totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 0);

  return (
    <div className="space-y-4">
      {/* Header / week controls */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setWeekStart((d) => addDays(d, -7))}
          className="size-9 grid place-items-center rounded-full bg-card outline-1 outline-black/5 hover:bg-muted/40"
          aria-label="Minggu sebelumnya"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="flex-1 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {isCurrentWeek ? "Minggu ini" : formatRange(weekStart, addDays(weekStart, 6))}
          </p>
          <p className="text-sm font-semibold tabular-nums">
            {formatDate(weekStart)} – {formatDate(addDays(weekStart, 6))}
          </p>
        </div>
        <button
          onClick={() => setWeekStart((d) => addDays(d, 7))}
          className="size-9 grid place-items-center rounded-full bg-card outline-1 outline-black/5 hover:bg-muted/40"
          aria-label="Minggu berikutnya"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Summary card */}
      <div className="bg-card rounded-3xl p-4 outline-1 outline-black/5 flex items-center gap-4">
        <AdherenceRing pct={overallAdherence} size="lg" label="Adherence minggu ini" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <Calendar className="size-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Rencana:</span>
            <span className="font-semibold tabular-nums">
              {Math.round(totalPlanned).toLocaleString("id-ID")} kcal
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <TrendingUp className="size-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Aktual:</span>
            <span className="font-semibold tabular-nums">
              {Math.round(totalActual).toLocaleString("id-ID")} kcal
            </span>
          </div>
          {streak && streak.streak > 0 && (
            <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-1 rounded-full">
              🔥 {streak.streak} hari streak (≥{streak.threshold}%)
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-2">
        {!isCurrentWeek && (
          <button
            onClick={() => setWeekStart(startOfWeek(new Date()))}
            className="flex items-center justify-center gap-2 bg-card py-2.5 rounded-2xl text-xs font-semibold outline-1 outline-black/5"
          >
            Hari ini
          </button>
        )}
        <button
          onClick={() => dupMut.mutate()}
          disabled={dupMut.isPending}
          className={cn(
            "flex items-center justify-center gap-2 bg-card py-2.5 rounded-2xl text-xs font-semibold outline-1 outline-black/5 disabled:opacity-60",
            isCurrentWeek ? "col-span-2" : "",
          )}
        >
          {dupMut.isPending ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Copy className="size-3" />
          )}
          Copy minggu lalu
        </button>
      </div>

      {/* Day cards */}
      {planLoading || adherenceLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 rounded-3xl bg-card animate-pulse" />
          ))}
        </div>
      ) : days.length === 0 ? (
        <EmptyWeek onCopyLastWeek={() => dupMut.mutate()} />
      ) : (
        <div className="space-y-3">
          {days.map((d) => (
            <DayPlanCard
              key={d.date}
              date={d.date}
              dayLabel={d.dayLabel}
              isToday={d.isToday}
              meals={d.meals}
              actualKcal={d.actualKcal}
              onSwap={(id) => swapMut.mutate(id)}
              isSwapping={swapMut.isPending}
              swappingId={swappingId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyWeek({ onCopyLastWeek }: { onCopyLastWeek: () => void }) {
  return (
    <div className="bg-card rounded-3xl p-6 text-center space-y-3 outline-1 outline-black/5">
      <Sparkles className="size-8 text-muted-foreground mx-auto" />
      <p className="text-sm text-muted-foreground">Belum ada meal plan untuk minggu ini.</p>
      <button
        onClick={onCopyLastWeek}
        className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-xs font-semibold"
      >
        <Copy className="size-3" />
        Copy minggu lalu
      </button>
    </div>
  );
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function formatRange(start: Date, end: Date): string {
  return `${formatDate(start)} – ${formatDate(end)}`;
}
