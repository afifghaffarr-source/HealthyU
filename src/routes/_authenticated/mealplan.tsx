import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { weekPlan, addPlan, deletePlan } from "@/features/mealplan/lib/mealplan.functions";
import { searchFoods } from "@/features/meals/lib/meals.functions";
import { BottomNav } from "@/components/bottom-nav";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { toast } from "@/lib/toast-config";
import {
  MEAL_TYPES,
  type MealTypeId,
  WeekNav,
  DayPlanCard,
  FoodPickerSheet,
} from "@/features/mealplan/components/MealPlanPieces";

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
    meal: MealTypeId;
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
    <main className="min-h-dvh bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-2 space-y-5">
        <TopAppBar title="Meal Plan" showBack />

        <WeekNav
          onPrev={() => {
            const d = new Date(weekStart);
            d.setDate(d.getDate() - 7);
            setWeekStart(d);
          }}
          onToday={() => setWeekStart(startOfWeek())}
          onNext={() => {
            const d = new Date(weekStart);
            d.setDate(d.getDate() + 7);
            setWeekStart(d);
          }}
        />

        {days.map((d) => (
          <DayPlanCard
            key={d.toISOString().slice(0, 10)}
            date={d}
            plans={plans}
            onAdd={(date, meal) => setPicker({ date, meal })}
            onDelete={(id) => delMut.mutate(id)}
          />
        ))}
      </div>

      {picker && (
        <FoodPickerSheet
          query={query}
          setQuery={setQuery}
          foods={foods}
          onClose={() => setPicker(null)}
          onPick={(payload) => addMut.mutate(payload)}
        />
      )}
      <BottomNav />
    </main>
  );
}
