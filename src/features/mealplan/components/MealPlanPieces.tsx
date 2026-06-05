import { Plus, X } from "lucide-react";

export const MEAL_TYPES = [
  { id: "breakfast", label: "Sarapan", emoji: "🌅" },
  { id: "lunch", label: "Makan siang", emoji: "🍱" },
  { id: "dinner", label: "Malam", emoji: "🌙" },
  { id: "snack", label: "Camilan", emoji: "🍎" },
] as const;

export type MealTypeId = (typeof MEAL_TYPES)[number]["id"];

export type PlanItem = {
  id: string;
  plan_date: string;
  meal_type: string;
  calories: number | string;
  custom_name: string | null;
  food_item: { name?: string } | null;
};

export function WeekNav({
  onPrev,
  onToday,
  onNext,
}: {
  onPrev: () => void;
  onToday: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <button onClick={onPrev} className="text-sm font-semibold text-primary">
        ← Minggu lalu
      </button>
      <button onClick={onToday} className="text-xs font-semibold text-muted-foreground">
        Minggu ini
      </button>
      <button onClick={onNext} className="text-sm font-semibold text-primary">
        Minggu depan →
      </button>
    </div>
  );
}

export function DayPlanCard({
  date,
  plans,
  onAdd,
  onDelete,
}: {
  date: Date;
  plans: PlanItem[];
  onAdd: (dateStr: string, meal: MealTypeId) => void;
  onDelete: (id: string) => void;
}) {
  const dateStr = date.toISOString().slice(0, 10);
  const dayPlans = plans.filter((p) => p.plan_date === dateStr);
  const totalCal = dayPlans.reduce((s, p) => s + Number(p.calories), 0);
  return (
    <section className="bg-card p-4 rounded-3xl outline-1 outline-black/5 animate-fade-up">
      <div className="flex justify-between items-baseline mb-3">
        <p className="font-bold">
          {date.toLocaleDateString("id-ID", {
            weekday: "long",
            day: "numeric",
            month: "short",
          })}
        </p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {Math.round(totalCal)} kcal
        </p>
      </div>
      <div className="space-y-2">
        {MEAL_TYPES.map((mt) => {
          const items = dayPlans.filter((p) => p.meal_type === mt.id);
          return (
            <div key={mt.id} className="flex items-start gap-2">
              <span className="text-lg mt-1">{mt.emoji}</span>
              <div className="flex-1">
                <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                  {mt.label}
                </p>
                {items.length === 0 ? (
                  <button
                    onClick={() => onAdd(dateStr, mt.id)}
                    className="text-xs text-primary font-semibold"
                  >
                    + Tambah
                  </button>
                ) : (
                  <div className="space-y-1">
                    {items.map((p) => (
                      <div key={p.id} className="flex items-center gap-2 text-sm">
                        <span className="flex-1 truncate">
                          {p.food_item?.name ?? p.custom_name}
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {Math.round(Number(p.calories))} kcal
                        </span>
                        <button onClick={() => onDelete(p.id)} className="text-muted-foreground">
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => onAdd(dateStr, mt.id)}
                      className="text-xs text-primary font-semibold"
                    >
                      + Tambah lagi
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function FoodPickerSheet({
  query,
  setQuery,
  foods,
  onClose,
  onPick,
}: {
  query: string;
  setQuery: (v: string) => void;
  foods: { id: string; name: string; calories: number | string }[];
  onClose: () => void;
  onPick: (payload: {
    food_item_id: string | null;
    custom_name: string | null;
    calories: number;
  }) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end" onClick={onClose}>
      <div
        className="bg-background w-full max-w-md mx-auto rounded-t-3xl p-5 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">Pilih makanan</h3>
          <button onClick={onClose}>
            <X className="size-5" />
          </button>
        </div>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari nasi goreng, ayam..."
          className="w-full bg-card outline-1 outline-black/10 rounded-2xl px-4 py-3 text-sm mb-3"
        />
        <div className="space-y-2">
          {foods.map((f) => (
            <button
              key={f.id}
              onClick={() =>
                onPick({
                  food_item_id: f.id,
                  custom_name: null,
                  calories: Number(f.calories),
                })
              }
              className="w-full bg-card p-3 rounded-2xl outline-1 outline-black/5 flex items-center justify-between text-left"
            >
              <span className="font-semibold text-sm">{f.name}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {Math.round(Number(f.calories))} kcal
              </span>
            </button>
          ))}
          {query && (
            <button
              onClick={() =>
                onPick({ food_item_id: null, custom_name: query, calories: 300 })
              }
              className="w-full bg-mint p-3 rounded-2xl text-sm font-semibold inline-flex items-center justify-center gap-1"
            >
              <Plus className="size-4" /> Tambah "{query}" (300 kcal)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}