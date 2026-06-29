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
import { parseNaturalLanguageFood } from "@/features/food/lib/aiFoodParser";
import { FoodConfirmation } from "@/features/food/components/FoodConfirmation";
import type { NlParsedFoodItem } from "@/features/food/lib/aiFoodParser";
import { getAchievementToastPrefix } from "@/lib/achievement-icons";
import { BottomNav } from "@/components/bottom-nav";
import { WifiOff, RefreshCw, Camera, PenLine, Utensils, Send, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { toast } from "@/lib/toast-config";
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
import { QuickRepeatRow } from "@/features/food/components/QuickRepeatRow";
import { QuickPresetsRow } from "@/features/food/components/QuickPresetsRow";

export function FoodPage() {
  const qc = useQueryClient();
  const search = useServerFn(searchFoods);
  const log = useServerFn(logMeal);
  const fetchMeals = useServerFn(todaysMeals);
  const del = useServerFn(deleteMeal);
  const parseVoice = useServerFn(parseMealFromVoice);
  const nlParse = useServerFn(parseNaturalLanguageFood);
  const { online, pending, sync } = useOfflineQueue();

  const [q, setQ] = useState("");
  const [mealType, setMealType] = useState<MealType>(currentMealType());

  // NL food parsing state
  const [nlText, setNlText] = useState("");
  const [nlParsing, setNlParsing] = useState(false);
  const [nlResults, setNlResults] = useState<NlParsedFoodItem[] | null>(null);
  const [nlRawInput, setNlRawInput] = useState("");

  const { basket, addToBasket, updateQty, removeFromBasket, basketTotals, logBasketM } =
    useFoodBasket(mealType);
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
        await enqueue("meal", payload).catch(() => {});
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

  // NL food parsing handler
  const handleNlParse = async () => {
    const trimmed = nlText.trim();
    if (!trimmed || trimmed.length < 2) return;
    setNlParsing(true);
    try {
      const result = await nlParse({ data: { text: trimmed } });
      setNlRawInput(trimmed);
      setNlResults(result.items);
    } catch (err) {
      toastError(err, "Gagal parse makanan");
    } finally {
      setNlParsing(false);
    }
  };

  const handleNlConfirm = async (items: NlParsedFoodItem[]) => {
    for (const item of items) {
      logMutation.mutate({
        food_item_id: item.matched_food_id ?? null,
        custom_name: item.matched_food_name ?? item.name,
        meal_type: mealType,
        serving_qty: item.portion_qty,
        calories: item.calories,
        protein_g: item.protein_g,
        carbs_g: item.carbs_g,
        fat_g: item.fat_g,
      });
    }
    setNlResults(null);
    setNlText("");
  };

  const {
    listening,
    parsing,
    start: handleVoice,
  } = useVoiceMealInput(async (transcript) => {
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

        {/* NL Food Input — type what you ate */}
        <div className="flex gap-2">
          <input
            type="text"
            value={nlText}
            onChange={(e) => setNlText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleNlParse();
            }}
            placeholder='Contoh: "nasi padang ayam bakar setengah porsi"'
            className="flex-1 bg-card border border-border/50 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
            disabled={nlParsing}
          />
          <button
            type="button"
            onClick={handleNlParse}
            disabled={nlParsing || nlText.trim().length < 2}
            className="bg-primary text-primary-foreground rounded-xl px-4 min-w-11 h-11 grid place-items-center disabled:opacity-50"
            aria-label="Parse makanan"
          >
            {nlParsing ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </button>
        </div>

        {q.trim() === "" && (
          <QuickRepeatRow
            currentMealType={mealType}
            onLog={(it) => logMutation.mutate(it)}
            disabled={logMutation.isPending}
          />
        )}

        {q.trim() === "" && (
          <QuickPresetsRow
            mealType={mealType}
            onLog={(it) => logMutation.mutate(it)}
            disabled={logMutation.isPending}
          />
        )}

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

        {meals.length === 0 && basket.length === 0 && q.trim() === "" && (
          <section className="bg-card p-6 rounded-3xl outline-1 outline-black/5 dark:outline-white/10 text-center space-y-3">
            <div className="size-12 mx-auto rounded-2xl bg-primary/10 grid place-items-center text-primary">
              <Utensils className="size-5" aria-hidden />
            </div>
            <div>
              <p className="font-semibold text-sm">Belum ada makanan hari ini.</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Mulai dengan scan makanan atau tambah manual.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Link
                to="/scan"
                className="inline-flex items-center justify-center gap-1.5 bg-primary text-primary-foreground text-sm font-semibold px-3 py-2.5 rounded-xl min-h-11"
              >
                <Camera className="size-4" aria-hidden /> Scan makanan
              </Link>
              <button
                type="button"
                onClick={() => {
                  const el = document.querySelector<HTMLInputElement>(
                    'input[type="search"], input[role="searchbox"], input[placeholder]',
                  );
                  el?.focus();
                }}
                className="inline-flex items-center justify-center gap-1.5 bg-muted text-foreground text-sm font-semibold px-3 py-2.5 rounded-xl min-h-11"
              >
                <PenLine className="size-4" aria-hidden /> Tambah manual
              </button>
            </div>
          </section>
        )}
      </div>
      {altFor && (
        <AlternativesModal
          target={altFor}
          onClose={() => setAltFor(null)}
          onAdd={(item) => addToBasket(item)}
        />
      )}

      {/* NL Food Confirmation Modal */}
      {nlResults !== null && (
        <FoodConfirmation
          items={nlResults}
          rawInput={nlRawInput}
          onConfirm={(items) => void handleNlConfirm(items)}
          onCancel={() => setNlResults(null)}
          isPending={logMutation.isPending}
        />
      )}

      <BottomNav />
    </main>
  );
}
