import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { History, Repeat2 } from "lucide-react";
import {
  frequentMeals,
  yesterdaysMeals,
} from "@/features/meals/lib/meals.functions";
import { labelMeal, type MealType } from "@/features/food/lib/foodHelpers";

type QuickItem = {
  food_item_id: string | null;
  custom_name: string | null;
  meal_type: MealType;
  serving_qty: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

/**
 * Two quick-action lanes:
 *   - "Ulang sarapan kemarin" — one tap to re-log yesterday's breakfast items.
 *   - "Sering kamu makan"     — top 2-week recurring meals, one tap to log again.
 * Both hidden when there is nothing to show, so they never feel empty.
 */
export function QuickRepeatRow({
  currentMealType,
  onLog,
  disabled,
}: {
  currentMealType: MealType;
  onLog: (item: QuickItem) => void;
  disabled?: boolean;
}) {
  const fetchYesterday = useServerFn(yesterdaysMeals);
  const fetchFrequent = useServerFn(frequentMeals);

  const { data: yMeals = [] } = useQuery({
    queryKey: ["meals", "yesterday", "breakfast"],
    queryFn: () => fetchYesterday({ data: { meal_type: "breakfast" } }),
    staleTime: 1000 * 60 * 10,
  });

  const { data: freq = [] } = useQuery({
    queryKey: ["meals", "frequent"],
    queryFn: () => fetchFrequent({ data: { limit: 6 } }),
    staleTime: 1000 * 60 * 10,
  });

  if (yMeals.length === 0 && freq.length === 0) return null;

  return (
    <section className="space-y-3 animate-fade-up">
      {yMeals.length > 0 && (
        <div className="bg-card p-4 rounded-3xl outline-1 outline-black/5 dark:outline-white/10 space-y-3">
          <div className="flex items-center gap-2">
            <span className="size-7 rounded-lg bg-primary/10 text-primary grid place-items-center" aria-hidden>
              <Repeat2 className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">Ulang sarapan kemarin</p>
              <p className="text-[11px] text-muted-foreground">
                Sekali ketuk untuk catat ulang.
              </p>
            </div>
          </div>
          <ul className="space-y-1.5">
            {yMeals.map((m) => {
              const name = m.food_item?.name ?? m.custom_name ?? "Makanan";
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      onLog({
                        food_item_id: m.food_item_id ?? null,
                        custom_name: m.food_item_id ? null : name,
                        meal_type: "breakfast",
                        serving_qty: Number(m.serving_qty ?? 1),
                        calories: Math.round(Number(m.calories ?? 0)),
                        protein_g: Number(m.protein_g ?? 0),
                        carbs_g: Number(m.carbs_g ?? 0),
                        fat_g: Number(m.fat_g ?? 0),
                      })
                    }
                    className="w-full text-left flex items-center gap-3 p-2.5 rounded-2xl bg-muted/40 hover:bg-muted transition disabled:opacity-50 min-h-11"
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium truncate">{name}</span>
                      <span className="block text-[11px] text-muted-foreground tabular-nums">
                        {Math.round(Number(m.calories ?? 0))} kkal
                      </span>
                    </span>
                    <span className="text-[11px] font-semibold text-primary shrink-0">
                      + Catat
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {freq.length > 0 && (
        <div className="bg-card p-4 rounded-3xl outline-1 outline-black/5 dark:outline-white/10 space-y-3">
          <div className="flex items-center gap-2">
            <span className="size-7 rounded-lg bg-secondary text-foreground grid place-items-center" aria-hidden>
              <History className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">Sering kamu makan</p>
              <p className="text-[11px] text-muted-foreground">
                Dari 30 hari terakhir — catat ulang ke {labelMeal(currentMealType).toLowerCase()}.
              </p>
            </div>
          </div>
          <ul className="grid grid-cols-1 gap-1.5">
            {freq.map((g) => (
              <li key={g.key}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    onLog({
                      food_item_id: g.food_item_id,
                      custom_name: g.custom_name,
                      meal_type: currentMealType,
                      serving_qty: g.serving_qty,
                      calories: g.calories,
                      protein_g: g.protein_g,
                      carbs_g: g.carbs_g,
                      fat_g: g.fat_g,
                    })
                  }
                  className="w-full text-left flex items-center gap-3 p-2.5 rounded-2xl bg-muted/40 hover:bg-muted transition disabled:opacity-50 min-h-11"
                >
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium truncate">{g.name}</span>
                    <span className="block text-[11px] text-muted-foreground tabular-nums">
                      {g.calories} kkal · {g.count}× / 30 hari
                    </span>
                  </span>
                  <span className="text-[11px] font-semibold text-primary shrink-0">+ Catat</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}