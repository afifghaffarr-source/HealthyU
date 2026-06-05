import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  searchFoods,
  logMeal,
  todaysMeals,
  deleteMeal,
} from "@/features/meals/lib/meals.functions";
import { parseMealFromVoice } from "@/features/ai/lib/ai-extras.functions";
import { getAchievementToastPrefix } from "@/lib/achievement-icons";
import { BottomNav } from "@/components/bottom-nav";
import { WifiOff, RefreshCw } from "lucide-react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { toast } from "sonner";
import { toastError } from "@/lib/toast-config";
import { enqueue } from "@/lib/offline-queue";
import { useOfflineQueue } from "@/hooks/use-offline-queue";
import { labelMeal, currentMealType, type MealType } from "@/features/food/lib/foodHelpers";
import { FoodSearchResult } from "@/features/food/components/FoodSearchResult";
import { MealBasket } from "@/features/food/components/MealBasket";
import { TodayMealsList } from "@/features/food/components/TodayMealsList";
import { AlternativesModal } from "@/features/food/components/AlternativesModal";
import { useVoiceMealInput } from "@/features/food/hooks/useVoiceMealInput";
import { FoodSearchBar, MealTypeTabs } from "@/features/food/components/FoodSearchBar";
import { useFoodBasket } from "@/features/food/hooks/useFoodBasket";

export function FoodPage() {
  const qc = useQueryClient();
  const search = useServerFn(searchFoods);
  const log = useServerFn(logMeal);
  const fetchMeals = useServerFn(todaysMeals);
  const del = useServerFn(deleteMeal);
  const parseVoice = useServerFn(parseMealFromVoice);
  const { online, pending, sync } = useOfflineQueue();

  const [q, setQ] = useState("");
  const [mealType, setMealType] = useState<MealType>(currentMealType());

  const {
    basket,
    addToBasket,
    updateQty,
    removeFromBasket,
    basketTotals,
    logBasketM,
  } = useFoodBasket(mealType);
  const [altFor, setAltFor] = useState<{ id: string; name: string } | null>(null);

  const { data: foods = [] } = useQuery({
    queryKey: ["foods", q],
    queryFn: () => search({ data: { q } }),
  });
  const { data: meals = [] } = useQuery({
    queryKey: ["meals", "today"],
    queryFn: () => fetchMeals(),
  });

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
    mutationFn: async (payload: LogPayload) => {
      if (!navigator.onLine) {
        await enqueue("meal", payload);
        return { offline: true as const };
      }
      return log({ data: payload });
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["meals"] });
      qc.invalidateQueries({ queryKey: ["game", "summary"] });
      if (res && "offline" in res && res.offline) {
        toast.success("Makanan disimpan offline. Akan sync otomatis.");
        return;
      }
      toast.success("Makanan dicatat");
      const game = "game" in res ? res.game : undefined;
      (game?.newlyUnlocked ?? []).forEach((a: { icon: string; title: string }) =>
        toast.success(`${getAchievementToastPrefix(a.icon)} ${a.title} terbuka!`),
      );
    },
    onError: (e) => toastError(e, "Gagal"),
  });

  const delMutation = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meals"] }),
  });

  const { listening, parsing, start: handleVoice } = useVoiceMealInput(async (transcript) => {
    try {
      const parsed = await parseVoice({ data: { transcript } });
      logMutation.mutate({
        food_item_id: null,
        custom_name: parsed.custom_name,
        meal_type: parsed.meal_type,
        serving_qty: parsed.serving_qty,
        calories: parsed.calories,
        protein_g: parsed.protein_g,
        carbs_g: parsed.carbs_g,
        fat_g: parsed.fat_g,
      });
    } catch (err) {
      toastError(err, "Gagal parse suara");
    }
  });

  return (
    <main className="min-h-dvh bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-2 space-y-5">
        <TopAppBar
          title="Catat makanan"
          subtitle="Cari, scan, atau bicarakan"
          showBack
          action={
            !online || pending > 0 ? (
              <button
                onClick={() => sync()}
                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-full ${online ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}`}
              >
                {online ? <RefreshCw className="size-3" /> : <WifiOff className="size-3" />}
                {online ? `Sync ${pending}` : `Offline${pending ? ` · ${pending}` : ""}`}
              </button>
            ) : undefined
          }
        />

        <MealTypeTabs mealType={mealType} setMealType={setMealType} labelMeal={labelMeal} />

        <FoodSearchBar
          q={q}
          setQ={setQ}
          listening={listening}
          parsing={parsing}
          onVoice={handleVoice}
        />

        <section className="space-y-2">
          {foods.map((f) => (
            <FoodSearchResult
              key={f.id}
              f={f}
              onShowAlternatives={() => setAltFor({ id: f.id, name: f.name })}
              onAddToBasket={() => addToBasket(f)}
              onLog={() =>
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
            />
          ))}
        </section>

        <MealBasket
          basket={basket}
          mealType={mealType}
          totalCalories={basketTotals.calories}
          isSubmitting={logBasketM.isPending}
          onUpdateQty={updateQty}
          onRemove={removeFromBasket}
          onSubmit={() => logBasketM.mutate()}
        />

        <TodayMealsList meals={meals} onDelete={(id) => delMutation.mutate(id)} />
      </div>
      {altFor && (
        <AlternativesModal
          target={altFor}
          onClose={() => setAltFor(null)}
          onAdd={(item) => addToBasket(item)}
        />
      )}
      <BottomNav />
    </main>
  );
}
