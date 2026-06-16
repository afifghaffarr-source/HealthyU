import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "@/lib/toast-config";
import { logMealWithItems } from "@/features/meals/lib/meals.functions";
import { toastError } from "@/lib/toast-config";
import { getAchievementToastPrefix } from "@/lib/achievement-icons";
import type { BasketItem } from "@/features/food/components/MealBasket";
import type { MealType } from "@/features/food/lib/foodHelpers";

export function useFoodBasket(mealType: MealType) {
  const qc = useQueryClient();
  const logMulti = useServerFn(logMealWithItems);
  const [basket, setBasket] = useState<BasketItem[]>([]);

  const addToBasket = (f: {
    id: string;
    name: string;
    serving_unit?: string | null;
    calories: number | string;
    protein_g?: number | string | null;
    carbs_g?: number | string | null;
    fat_g?: number | string | null;
  }) => {
    setBasket((prev) => [
      ...prev,
      {
        key: `${f.id}-${Date.now()}`,
        food_item_id: f.id,
        food_name: f.name,
        serving_qty: 1,
        serving_unit: f.serving_unit ?? null,
        calories: Number(f.calories),
        protein_g: Number(f.protein_g ?? 0),
        carbs_g: Number(f.carbs_g ?? 0),
        fat_g: Number(f.fat_g ?? 0),
      },
    ]);
  };

  const updateQty = (k: string, delta: number) =>
    setBasket((prev) =>
      prev.map((b) =>
        b.key === k
          ? { ...b, serving_qty: Math.max(0.1, Math.round((b.serving_qty + delta) * 10) / 10) }
          : b,
      ),
    );

  const removeFromBasket = (k: string) => setBasket((prev) => prev.filter((b) => b.key !== k));

  const basketTotals = basket.reduce(
    (a, b) => ({
      calories: a.calories + b.calories * b.serving_qty,
      protein_g: a.protein_g + b.protein_g * b.serving_qty,
      carbs_g: a.carbs_g + b.carbs_g * b.serving_qty,
      fat_g: a.fat_g + b.fat_g * b.serving_qty,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );

  const logBasketM = useMutation({
    mutationFn: () =>
      logMulti({
        data: {
          meal_type: mealType,
          items: basket.map(({ key: _k, ...rest }) => rest),
        },
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["meals"] });
      qc.invalidateQueries({ queryKey: ["game", "summary"] });
      toast.success(`Tercatat ${basket.length} item · ${Math.round(basketTotals.calories)} kcal`);
      setBasket([]);
      (res?.game?.newlyUnlocked ?? []).forEach((a: { icon: string; title: string }) =>
        toast.success(`${getAchievementToastPrefix(a.icon)} ${a.title} terbuka!`),
      );
    },
    onError: (e) => toastError(e, "Gagal"),
  });

  return {
    basket,
    addToBasket,
    updateQty,
    removeFromBasket,
    basketTotals,
    logBasketM,
  };
}
