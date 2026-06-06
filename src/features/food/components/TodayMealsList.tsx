import { Trash2 } from "lucide-react";
import { labelMeal, type MealType } from "@/features/food/lib/foodHelpers";

type Meal = {
  id: string;
  meal_type: string;
  calories: number | string;
  custom_name: string | null;
  food_item: { name?: string } | null;
  protein_g?: number | string | null;
  carbs_g?: number | string | null;
  fat_g?: number | string | null;
  logged_at?: string | null;
};

const ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

function formatTime(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export function TodayMealsList({
  meals,
  onDelete,
}: {
  meals: Meal[];
  onDelete: (id: string) => void;
}) {
  if (meals.length === 0) return null;
  const groups = ORDER.map((type) => ({
    type,
    items: meals.filter((m) => m.meal_type === type),
  })).filter((g) => g.items.length > 0);
  const totalKcal = meals.reduce((s, m) => s + Number(m.calories || 0), 0);
  return (
    <section className="pt-2">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-bold">Tercatat hari ini</h2>
        <p className="text-xs text-muted-foreground tabular-nums">
          {Math.round(totalKcal)} kcal · {meals.length} item
        </p>
      </div>
      <div className="space-y-5">
        {groups.map((g) => {
          const groupKcal = g.items.reduce((s, m) => s + Number(m.calories || 0), 0);
          return (
            <div key={g.type} className="space-y-2">
              <div className="flex items-baseline justify-between px-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {labelMeal(g.type)}
                </p>
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  {Math.round(groupKcal)} kcal
                </p>
              </div>
              <ul className="space-y-2">
                {g.items.map((m) => {
                  const time = formatTime(m.logged_at);
                  const p = Math.round(Number(m.protein_g ?? 0));
                  const c = Math.round(Number(m.carbs_g ?? 0));
                  const f = Math.round(Number(m.fat_g ?? 0));
                  const hasMacros = p || c || f;
                  return (
                    <li
                      key={m.id}
                      className="bg-card p-3 rounded-2xl outline-1 outline-black/5 dark:outline-white/10 flex items-center gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {m.food_item?.name ?? m.custom_name ?? "Makanan"}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                          {time && <span>{time}</span>}
                          {time && hasMacros ? " · " : ""}
                          {hasMacros ? `P ${p}g · K ${c}g · L ${f}g` : ""}
                        </p>
                      </div>
                      <p className="text-sm font-bold tabular-nums shrink-0">
                        {Math.round(Number(m.calories))}
                        <span className="text-[10px] text-muted-foreground"> kcal</span>
                      </p>
                      <button
                        onClick={() => onDelete(m.id)}
                        className="size-9 rounded-lg grid place-items-center text-muted-foreground hover:text-destructive shrink-0"
                        aria-label={`Hapus ${m.food_item?.name ?? m.custom_name ?? "makanan"}`}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
