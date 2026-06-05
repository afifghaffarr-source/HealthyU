import { Trash2 } from "lucide-react";
import { labelMeal, type MealType } from "@/lib/foodHelpers";

type Meal = {
  id: string;
  meal_type: string;
  calories: number | string;
  custom_name: string | null;
  food_item: { name?: string } | null;
};

export function TodayMealsList({
  meals,
  onDelete,
}: {
  meals: Meal[];
  onDelete: (id: string) => void;
}) {
  if (meals.length === 0) return null;
  return (
    <section className="pt-2">
      <h2 className="font-bold mb-3">Tercatat hari ini</h2>
      <div className="space-y-2">
        {meals.map((m) => (
          <div
            key={m.id}
            className="bg-card p-3 rounded-2xl outline-1 outline-black/5 flex items-center gap-3"
          >
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase text-coral tracking-wider">
                {labelMeal(m.meal_type as MealType)}
              </p>
              <p className="font-semibold text-sm truncate">
                {m.food_item?.name ?? m.custom_name}
              </p>
            </div>
            <p className="text-sm font-bold tabular-nums">
              {Math.round(Number(m.calories))} kcal
            </p>
            <button
              onClick={() => onDelete(m.id)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}