import { Link } from "@tanstack/react-router";

type Meal = {
  id: string;
  meal_type: string;
  calories: number | string;
  custom_name?: string | null;
  food_item?: unknown;
};

export function TodaysMeals({ meals }: { meals: Meal[] }) {
  return (
    <section className="animate-fade-up">
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-bold">Makan hari ini</h2>
        <Link to="/food" className="text-xs font-semibold text-primary">
          + Tambah
        </Link>
      </div>
      {meals.length === 0 ? (
        <div className="bg-card p-6 rounded-3xl outline-1 outline-black/5 text-center">
          <p className="text-sm text-muted-foreground mb-3">Belum ada catatan hari ini</p>
          <Link
            to="/food"
            className="inline-block bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-xl"
          >
            Catat makanan
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {meals.map((m) => (
            <div
              key={m.id}
              className="bg-card p-3 rounded-2xl outline-1 outline-black/5 flex items-center gap-3"
            >
              <div className="size-12 rounded-xl bg-mint grid place-items-center text-lg">🍽️</div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase text-coral tracking-wider">
                  {m.meal_type}
                </p>
                <p className="font-semibold text-sm truncate">
                  {(m.food_item as { name?: string } | null)?.name ?? m.custom_name ?? "Makanan"}
                </p>
              </div>
              <p className="text-sm font-bold tabular-nums">
                {Math.round(Number(m.calories))}
                <span className="text-[10px] text-muted-foreground"> kcal</span>
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}