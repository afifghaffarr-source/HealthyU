/**
 * DayPlanCard — single day's plan: 4 meal chips + kcal summary + adherence bar.
 * Tap meal → open MealSwapSheet. Used in WeekCalendar.
 */
import { Sunrise, Sun, Moon, Cookie, RefreshCw, Loader2, type LucideIcon } from "lucide-react";
import { AdherenceRing } from "./AdherenceRing";
import { cn } from "@/lib/utils";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

type DayMeal = {
  id: string;
  meal_type: MealType;
  custom_name: string | null;
  calories: number;
  confidence?: string | null;
  swapped_from_id?: string | null;
  note?: string | null;
};

const ICONS: Record<MealType, LucideIcon> = {
  breakfast: Sunrise,
  lunch: Sun,
  dinner: Moon,
  snack: Cookie,
};

const LABELS: Record<MealType, string> = {
  breakfast: "Sarapan",
  lunch: "Siang",
  dinner: "Malam",
  snack: "Snack",
};

export function DayPlanCard({
  date,
  dayLabel,
  isToday,
  meals,
  actualKcal,
  onSwap,
  isSwapping,
  swappingId,
}: {
  date: string;
  dayLabel: string;
  isToday: boolean;
  meals: DayMeal[];
  actualKcal: number;
  onSwap: (planId: string) => void;
  isSwapping: boolean;
  swappingId: string | null;
}) {
  const plannedKcal = meals.reduce((s, m) => s + (Number(m.calories) || 0), 0);
  const adherencePct = plannedKcal > 0 ? (actualKcal / plannedKcal) * 100 : 0;

  // Group meals by type so we can show empty placeholders
  const byType: Record<MealType, DayMeal | null> = {
    breakfast: null,
    lunch: null,
    dinner: null,
    snack: null,
  };
  for (const m of meals) byType[m.meal_type] = m;

  return (
    <div
      className={cn(
        "rounded-3xl outline-1 outline-black/5 p-4 space-y-3 transition-all",
        isToday ? "bg-primary/5 outline-primary/30 ring-2 ring-primary/10" : "bg-card",
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p
            className={cn(
              "text-[10px] font-bold uppercase tracking-wider",
              isToday ? "text-primary" : "text-muted-foreground",
            )}
          >
            {isToday ? "Hari ini" : dayLabel}
          </p>
          <p className="text-sm font-semibold tabular-nums">{formatDateShort(date)}</p>
        </div>
        <AdherenceRing
          pct={adherencePct}
          size="sm"
          label={`${Math.round(actualKcal)}/${Math.round(plannedKcal)}`}
        />
      </div>

      <div className="space-y-1.5">
        {(Object.keys(byType) as MealType[]).map((t) => {
          const m = byType[t];
          const Icon = ICONS[t];
          const isThisSwapping = isSwapping && swappingId === m?.id;
          return (
            <div
              key={t}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-2xl text-xs",
                m ? "bg-background" : "bg-muted/30 border border-dashed",
              )}
            >
              <Icon
                className={cn("size-3.5 shrink-0", m ? "text-primary" : "text-muted-foreground")}
              />
              <span
                className={cn(
                  "font-semibold shrink-0 w-12",
                  m ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {LABELS[t]}
              </span>
              {m ? (
                <>
                  <span className="flex-1 truncate text-foreground">{m.custom_name ?? "Menu"}</span>
                  {m.confidence === "low" && (
                    <span
                      className="text-[9px] uppercase font-bold text-amber-600"
                      title="AI tidak yakin dengan pilihan ini"
                    >
                      ⚠
                    </span>
                  )}
                  <span className="tabular-nums text-muted-foreground font-semibold shrink-0">
                    {Math.round(m.calories)}
                  </span>
                  <button
                    onClick={() => onSwap(m.id)}
                    disabled={isThisSwapping}
                    className="size-6 grid place-items-center rounded-full hover:bg-muted disabled:opacity-50 shrink-0"
                    aria-label={`Swap ${LABELS[t]}`}
                  >
                    {isThisSwapping ? (
                      <Loader2 className="size-3 animate-spin text-muted-foreground" />
                    ) : (
                      <RefreshCw className="size-3 text-muted-foreground" />
                    )}
                  </button>
                </>
              ) : (
                <span className="flex-1 text-muted-foreground italic">Belum direncanakan</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatDateShort(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
