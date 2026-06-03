import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { searchFoods, logMeal, todaysMeals, deleteMeal } from "@/lib/meals.functions";
import { BottomNav } from "@/components/bottom-nav";
import { ArrowLeft, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/food")({
  component: FoodPage,
});

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

function FoodPage() {
  const qc = useQueryClient();
  const search = useServerFn(searchFoods);
  const log = useServerFn(logMeal);
  const fetchMeals = useServerFn(todaysMeals);
  const del = useServerFn(deleteMeal);

  const [q, setQ] = useState("");
  const [mealType, setMealType] = useState<MealType>(currentMealType());

  const { data: foods = [] } = useQuery({ queryKey: ["foods", q], queryFn: () => search({ data: { q } }) });
  const { data: meals = [] } = useQuery({ queryKey: ["meals", "today"], queryFn: () => fetchMeals() });

  type LogPayload = {
    food_item_id: string | null;
    custom_name: string | null;
    meal_type: MealType;
    serving_qty: number;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  const logMutation = useMutation({
    mutationFn: (payload: LogPayload) => log({ data: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meals"] });
      toast.success("Makanan dicatat");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal"),
  });

  const delMutation = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meals"] }),
  });

  return (
    <main className="min-h-screen bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-8 space-y-5">
        <header className="flex items-center gap-3">
          <Link to="/dashboard" className="size-10 bg-card rounded-2xl outline-1 outline-black/10 grid place-items-center">
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="text-2xl font-bold">Catat makanan</h1>
        </header>

        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5">
          {(["breakfast", "lunch", "dinner", "snack"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setMealType(t)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition ${mealType === t ? "bg-primary text-primary-foreground" : "bg-card outline-1 outline-black/10"}`}
            >
              {labelMeal(t)}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari makanan (nasi goreng, ayam bakar...)"
            className="w-full pl-11 pr-4 py-3.5 bg-card outline-1 outline-black/10 rounded-2xl text-sm"
          />
        </div>

        <section className="space-y-2">
          {foods.map((f) => (
            <button
              key={f.id}
              onClick={() =>
                logMutation.mutate({
                  food_item_id: f.id,
                  custom_name: null,
                  meal_type: mealType,
                  serving_qty: 1,
                  calories: Number(f.calories),
                  protein_g: Number(f.protein_g ?? 0),
                  carbs_g: Number(f.carbs_g ?? 0),
                  fat_g: Number(f.fat_g ?? 0),
                })
              }
              className="w-full text-left bg-card p-3 rounded-2xl outline-1 outline-black/5 flex items-center gap-3 hover:bg-secondary/40 transition"
            >
              <div className="size-12 rounded-xl bg-mint grid place-items-center text-lg">🍽️</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{f.name}</p>
                <p className="text-[11px] text-muted-foreground">{Math.round(Number(f.calories))} kcal · {f.serving_size}{f.serving_unit}</p>
              </div>
              <span className="text-primary text-xs font-bold">+ Tambah</span>
            </button>
          ))}
        </section>

        {meals.length > 0 && (
          <section className="pt-2">
            <h2 className="font-bold mb-3">Tercatat hari ini</h2>
            <div className="space-y-2">
              {meals.map((m) => (
                <div key={m.id} className="bg-card p-3 rounded-2xl outline-1 outline-black/5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase text-coral tracking-wider">{labelMeal(m.meal_type as MealType)}</p>
                    <p className="font-semibold text-sm truncate">{(m.food_item as { name?: string } | null)?.name ?? m.custom_name}</p>
                  </div>
                  <p className="text-sm font-bold tabular-nums">{Math.round(Number(m.calories))} kcal</p>
                  <button onClick={() => delMutation.mutate(m.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
      <BottomNav />
    </main>
  );
}

function labelMeal(t: MealType): string {
  return { breakfast: "Sarapan", lunch: "Makan Siang", dinner: "Makan Malam", snack: "Camilan" }[t];
}
function currentMealType(): MealType {
  const h = new Date().getHours();
  if (h < 10) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 20) return "dinner";
  return "snack";
}