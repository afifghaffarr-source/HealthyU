import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { weekPlan, addPlan, deletePlan } from "@/lib/mealplan.functions";
import { searchFoods } from "@/lib/meals.functions";
import { BottomNav } from "@/components/bottom-nav";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/mealplan")({
  component: MealPlanPage,
});

function startOfWeek(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0 sun .. 6 sat
  const diff = (day + 6) % 7; // mon=0
  x.setDate(x.getDate() - diff);
  return x;
}

const MEAL_TYPES = [
  { id: "breakfast", label: "Sarapan", emoji: "🌅" },
  { id: "lunch", label: "Makan siang", emoji: "🍱" },
  { id: "dinner", label: "Malam", emoji: "🌙" },
  { id: "snack", label: "Camilan", emoji: "🍎" },
] as const;

function MealPlanPage() {
  const qc = useQueryClient();
  const fetchWeek = useServerFn(weekPlan);
  const add = useServerFn(addPlan);
  const del = useServerFn(deletePlan);
  const search = useServerFn(searchFoods);

  const [weekStart, setWeekStart] = useState(startOfWeek());
  const startDate = weekStart.toISOString().slice(0, 10);

  const { data: plans = [] } = useQuery({
    queryKey: ["mealplan", startDate],
    queryFn: () => fetchWeek({ data: { start_date: startDate } }),
  });

  const [picker, setPicker] = useState<{
    date: string;
    meal: (typeof MEAL_TYPES)[number]["id"];
  } | null>(null);
  const [query, setQuery] = useState("");
  const { data: foods = [] } = useQuery({
    queryKey: ["foods", query],
    queryFn: () => search({ data: { q: query } }),
    enabled: !!picker,
  });

  const addMut = useMutation({
    mutationFn: (payload: {
      food_item_id: string | null;
      custom_name: string | null;
      calories: number;
    }) =>
      add({
        data: {
          plan_date: picker!.date,
          meal_type: picker!.meal,
          food_item_id: payload.food_item_id,
          custom_name: payload.custom_name,
          calories: payload.calories,
          planned_qty: 1,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mealplan", startDate] });
      toast.success("Rencana ditambahkan");
      setPicker(null);
      setQuery("");
    },
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mealplan", startDate] }),
  });

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <main className="min-h-screen bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-2 space-y-5">
        <TopAppBar title="Meal Plan" showBack />

        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              const d = new Date(weekStart);
              d.setDate(d.getDate() - 7);
              setWeekStart(d);
            }}
            className="text-sm font-semibold text-primary"
          >
            ← Minggu lalu
          </button>
          <button
            onClick={() => setWeekStart(startOfWeek())}
            className="text-xs font-semibold text-muted-foreground"
          >
            Minggu ini
          </button>
          <button
            onClick={() => {
              const d = new Date(weekStart);
              d.setDate(d.getDate() + 7);
              setWeekStart(d);
            }}
            className="text-sm font-semibold text-primary"
          >
            Minggu depan →
          </button>
        </div>

        {days.map((d) => {
          const dateStr = d.toISOString().slice(0, 10);
          const dayPlans = plans.filter((p) => p.plan_date === dateStr);
          const totalCal = dayPlans.reduce((s, p) => s + Number(p.calories), 0);
          return (
            <section
              key={dateStr}
              className="bg-card p-4 rounded-3xl outline-1 outline-black/5 animate-fade-up"
            >
              <div className="flex justify-between items-baseline mb-3">
                <p className="font-bold">
                  {d.toLocaleDateString("id-ID", {
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
                            onClick={() => setPicker({ date: dateStr, meal: mt.id })}
                            className="text-xs text-primary font-semibold"
                          >
                            + Tambah
                          </button>
                        ) : (
                          <div className="space-y-1">
                            {items.map((p) => (
                              <div key={p.id} className="flex items-center gap-2 text-sm">
                                <span className="flex-1 truncate">
                                  {(p.food_item as { name?: string } | null)?.name ?? p.custom_name}
                                </span>
                                <span className="text-xs text-muted-foreground tabular-nums">
                                  {Math.round(Number(p.calories))} kcal
                                </span>
                                <button
                                  onClick={() => delMut.mutate(p.id)}
                                  className="text-muted-foreground"
                                >
                                  <X className="size-3.5" />
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={() => setPicker({ date: dateStr, meal: mt.id })}
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
        })}
      </div>

      {picker && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end"
          onClick={() => setPicker(null)}
        >
          <div
            className="bg-background w-full max-w-md mx-auto rounded-t-3xl p-5 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold">Pilih makanan</h3>
              <button onClick={() => setPicker(null)}>
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
                    addMut.mutate({
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
                    addMut.mutate({
                      food_item_id: null,
                      custom_name: query,
                      calories: 300,
                    })
                  }
                  className="w-full bg-mint p-3 rounded-2xl text-sm font-semibold inline-flex items-center justify-center gap-1"
                >
                  <Plus className="size-4" /> Tambah "{query}" (300 kcal)
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      <BottomNav />
    </main>
  );
}
