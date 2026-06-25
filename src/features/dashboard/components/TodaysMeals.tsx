import { Link } from "@tanstack/react-router";
import { Camera, PenLine, Utensils } from "lucide-react";

type Meal = {
  id: string;
  meal_type: string;
  calories: number | string;
  custom_name?: string | null;
  food_item?: unknown;
};

const MEAL_TYPE_ORDER = ["breakfast", "lunch", "dinner", "snack"] as const;
const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "Sarapan",
  lunch: "Makan Siang",
  dinner: "Makan Malam",
  snack: "Camilan",
};

const MEAL_TYPE_EMOJIS: Record<string, string> = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
  snack: "🍪",
};

export function TodaysMeals({ meals }: { meals: Meal[] }) {
  // Phase 3 (8.3): Group meals by meal_type
  const grouped = MEAL_TYPE_ORDER.reduce(
    (acc, type) => {
      acc[type] = meals.filter((m) => m.meal_type === type);
      return acc;
    },
    {} as Record<string, Meal[]>,
  );

  return (
    <section className="animate-fade-up">
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-bold">Makan hari ini</h2>
        <Link to="/food" className="text-xs font-semibold text-primary">
          + Tambah
        </Link>
      </div>
      {meals.length === 0 ? (
        <div className="bg-card p-6 rounded-3xl outline-1 outline-black/5 dark:outline-white/10 text-center space-y-3">
          <div className="size-12 mx-auto rounded-2xl bg-primary/10 grid place-items-center text-primary">
            <Utensils className="size-5" aria-hidden />
          </div>
          <div>
            <p className="font-semibold text-sm">Belum ada catatan hari ini</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Mulai dari foto atau cari makanan manual — santai saja.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Link
              to="/scan"
              className="inline-flex items-center justify-center gap-1.5 bg-primary text-primary-foreground text-sm font-semibold px-3 py-2.5 rounded-xl min-h-11"
            >
              <Camera className="size-4" /> Scan
            </Link>
            <Link
              to="/food"
              className="inline-flex items-center justify-center gap-1.5 bg-muted text-foreground text-sm font-semibold px-3 py-2.5 rounded-xl min-h-11"
            >
              <PenLine className="size-4" /> Manual
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {MEAL_TYPE_ORDER.map((type) => {
            const typeMeals = grouped[type];
            if (typeMeals.length === 0) return null;
            const totalCal = typeMeals.reduce((sum, m) => sum + Number(m.calories || 0), 0);
            return (
              <div key={type} className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{MEAL_TYPE_EMOJIS[type]}</span>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {MEAL_TYPE_LABELS[type] || type}
                    </h3>
                  </div>
                  <p className="text-xs font-bold text-muted-foreground tabular-nums">
                    {Math.round(totalCal)} kkal
                  </p>
                </div>
                <div className="space-y-2">
                  {typeMeals.map((m) => (
                    <div
                      key={m.id}
                      className="bg-card p-3 rounded-2xl outline-1 outline-black/5 flex items-center gap-3"
                    >
                      <div className="size-12 rounded-xl bg-mint grid place-items-center text-lg">
                        🍽️
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {(m.food_item as { name?: string } | null)?.name ??
                            m.custom_name ??
                            "Makanan"}
                        </p>
                      </div>
                      <p className="text-sm font-bold tabular-nums">
                        {Math.round(Number(m.calories))}
                        <span className="text-[10px] text-muted-foreground"> kcal</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
