import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  searchFoods,
  logMeal,
  todaysMeals,
  deleteMeal,
  logMealWithItems,
} from "@/lib/meals.functions";
import { parseMealFromVoice } from "@/lib/ai-extras.functions";
import { getAchievementToastPrefix } from "@/lib/achievement-icons";
import { BottomNav } from "@/components/bottom-nav";
import { Search, Mic, MicOff, Loader2, WifiOff, RefreshCw } from "lucide-react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { toast } from "sonner";
import { toastError } from "@/lib/toast-config";
import { enqueue } from "@/lib/offline-queue";
import { useOfflineQueue } from "@/hooks/use-offline-queue";
import { labelMeal, currentMealType, type MealType } from "@/features/food/lib/foodHelpers";
import { FoodSearchResult } from "@/features/food/components/FoodSearchResult";
import { MealBasket, type BasketItem } from "@/features/food/components/MealBasket";
import { TodayMealsList } from "@/features/food/components/TodayMealsList";
import { AlternativesModal } from "@/features/food/components/AlternativesModal";

export function FoodPage() {
  const qc = useQueryClient();
  const search = useServerFn(searchFoods);
  const log = useServerFn(logMeal);
  const logMulti = useServerFn(logMealWithItems);
  const fetchMeals = useServerFn(todaysMeals);
  const del = useServerFn(deleteMeal);
  const parseVoice = useServerFn(parseMealFromVoice);
  const { online, pending, sync } = useOfflineQueue();

  const [q, setQ] = useState("");
  const [mealType, setMealType] = useState<MealType>(currentMealType());
  const [listening, setListening] = useState(false);
  const [parsing, setParsing] = useState(false);

  const [basket, setBasket] = useState<BasketItem[]>([]);
  const [altFor, setAltFor] = useState<{ id: string; name: string } | null>(null);

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

  const handleVoice = () => {
    type SR = {
      new (): {
        lang: string;
        continuous: boolean;
        interimResults: boolean;
        start: () => void;
        stop: () => void;
        onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
        onerror: (e: { error: string }) => void;
        onend: () => void;
      };
    };
    const w = window as unknown as { SpeechRecognition?: SR; webkitSpeechRecognition?: SR };
    const SRClass = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SRClass) {
      toast.error("Browser tidak mendukung voice. Gunakan Chrome.");
      return;
    }
    const rec = new SRClass();
    rec.lang = "id-ID";
    rec.continuous = false;
    rec.interimResults = false;
    setListening(true);
    rec.onresult = async (e) => {
      const transcript = e.results[0]?.[0]?.transcript ?? "";
      setListening(false);
      if (!transcript) return;
      setParsing(true);
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
      } finally {
        setParsing(false);
      }
    };
    rec.onerror = (e) => {
      setListening(false);
      toast.error(`Voice error: ${e.error}`);
    };
    rec.onend = () => setListening(false);
    rec.start();
  };

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
            className="w-full pl-11 pr-14 py-3.5 bg-card outline-1 outline-black/10 rounded-2xl text-sm"
          />
          <button
            type="button"
            onClick={handleVoice}
            disabled={listening || parsing}
            title="Catat dengan suara"
            className={`absolute right-2 top-1/2 -translate-y-1/2 size-9 rounded-xl grid place-items-center transition ${listening ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-primary text-primary-foreground"}`}
          >
            {parsing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : listening ? (
              <MicOff className="size-4" />
            ) : (
              <Mic className="size-4" />
            )}
          </button>
        </div>
        {(listening || parsing) && (
          <p className="text-xs text-muted-foreground -mt-3">
            {listening ? "🎤 Mendengarkan... ucapkan makanan Anda" : "🤖 Memproses dengan AI..."}
          </p>
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
