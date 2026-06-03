import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { searchFoods, logMeal, todaysMeals, deleteMeal, logMealWithItems } from "@/lib/meals.functions";
import { parseMealFromVoice } from "@/lib/ai-extras.functions";
import { getAchievementToastPrefix } from "@/lib/achievement-icons";
import { BottomNav } from "@/components/bottom-nav";
import { ArrowLeft, Search, Trash2, Mic, MicOff, Loader2, WifiOff, RefreshCw, Plus, Minus, ShoppingBasket, Sparkles, X } from "lucide-react";
import { getFoodAlternatives } from "@/lib/foodAlternatives.functions";
import { toast } from "sonner";
import { enqueue } from "@/lib/offline-queue";
import { useOfflineQueue } from "@/hooks/use-offline-queue";

export const Route = createFileRoute("/_authenticated/food")({
  component: FoodPage,
});

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

function FoodPage() {
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

  type BasketItem = {
    key: string;
    food_item_id: string | null;
    food_name: string;
    serving_qty: number;
    serving_unit: string | null;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  const [basket, setBasket] = useState<BasketItem[]>([]);
  const [altFor, setAltFor] = useState<{ id: string; name: string } | null>(null);
  const altFn = useServerFn(getFoodAlternatives);
  const { data: alts = [], isLoading: altLoading } = useQuery({
    queryKey: ["food-alternatives", altFor?.id],
    queryFn: () => altFn({ data: { food_id: altFor!.id } }),
    enabled: !!altFor,
  });

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
      prev
        .map((b) => (b.key === k ? { ...b, serving_qty: Math.max(0.1, Math.round((b.serving_qty + delta) * 10) / 10) } : b))
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
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal"),
  });

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
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal"),
  });

  const delMutation = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meals"] }),
  });

  const handleVoice = () => {
    type SR = { new (): { lang: string; continuous: boolean; interimResults: boolean; start: () => void; stop: () => void; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onerror: (e: { error: string }) => void; onend: () => void } };
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
        toast.error(err instanceof Error ? err.message : "Gagal parse suara");
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
    <main className="min-h-screen bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-8 space-y-5">
        <header className="flex items-center gap-3">
          <Link to="/dashboard" className="size-10 bg-card rounded-2xl outline-1 outline-black/10 grid place-items-center">
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="text-2xl font-bold">Catat makanan</h1>
          {(!online || pending > 0) && (
            <button
              onClick={() => sync()}
              className={`ml-auto inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-full ${online ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}`}
            >
              {online ? <RefreshCw className="size-3" /> : <WifiOff className="size-3" />}
              {online ? `Sync ${pending}` : `Offline${pending ? ` · ${pending}` : ""}`}
            </button>
          )}
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
            className="w-full pl-11 pr-14 py-3.5 bg-card outline-1 outline-black/10 rounded-2xl text-sm"
          />
          <button
            type="button"
            onClick={handleVoice}
            disabled={listening || parsing}
            title="Catat dengan suara"
            className={`absolute right-2 top-1/2 -translate-y-1/2 size-9 rounded-xl grid place-items-center transition ${listening ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-primary text-primary-foreground"}`}
          >
            {parsing ? <Loader2 className="size-4 animate-spin" /> : listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
          </button>
        </div>
        {(listening || parsing) && (
          <p className="text-xs text-muted-foreground -mt-3">
            {listening ? "🎤 Mendengarkan... ucapkan makanan Anda" : "🤖 Memproses dengan AI..."}
          </p>
        )}

        <section className="space-y-2">
          {foods.map((f) => (
            <div key={f.id} className="w-full text-left bg-card p-3 rounded-2xl outline-1 outline-black/5 flex items-center gap-3">
              <div className="size-12 rounded-xl bg-mint grid place-items-center text-lg">🍽️</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{f.name}</p>
                <p className="text-[11px] text-muted-foreground">{Math.round(Number(f.calories))} kcal · {f.serving_size}{f.serving_unit}</p>
              </div>
              <button
                onClick={() => addToBasket(f)}
                className="size-9 rounded-full bg-primary/10 text-primary grid place-items-center hover:bg-primary/20"
                aria-label="Tambah ke keranjang"
              >
                <Plus className="size-4" />
              </button>
              <button
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
                className="text-primary text-xs font-bold"
              >
                Catat
              </button>
            </div>
          ))}
        </section>

        {basket.length > 0 && (
          <section className="bg-card p-4 rounded-3xl outline-1 outline-black/5 space-y-3 animate-fade-up">
            <div className="flex items-center gap-2">
              <ShoppingBasket className="size-4 text-primary" />
              <h2 className="font-bold text-sm">Keranjang ({basket.length})</h2>
              <span className="ml-auto text-sm font-bold tabular-nums">{Math.round(basketTotals.calories)} kcal</span>
            </div>
            <div className="space-y-2">
              {basket.map((b) => (
                <div key={b.key} className="flex items-center gap-2 bg-muted/40 rounded-xl px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{b.food_name}</p>
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      {Math.round(b.calories * b.serving_qty)} kcal · P{(b.protein_g * b.serving_qty).toFixed(0)} K{(b.carbs_g * b.serving_qty).toFixed(0)} L{(b.fat_g * b.serving_qty).toFixed(0)}
                    </p>
                  </div>
                  <button onClick={() => updateQty(b.key, -0.5)} className="size-7 rounded-full bg-background grid place-items-center"><Minus className="size-3" /></button>
                  <span className="w-8 text-center text-xs font-bold tabular-nums">{b.serving_qty}x</span>
                  <button onClick={() => updateQty(b.key, 0.5)} className="size-7 rounded-full bg-background grid place-items-center"><Plus className="size-3" /></button>
                  <button onClick={() => removeFromBasket(b.key)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => logBasketM.mutate()}
              disabled={logBasketM.isPending}
              className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-2xl disabled:opacity-50"
            >
              Catat semua sebagai {labelMeal(mealType).toLowerCase()}
            </button>
          </section>
        )}

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