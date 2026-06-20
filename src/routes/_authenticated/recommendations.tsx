import { createFileRoute } from "@tanstack/react-router";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  generateMealPlan,
  acceptMealPlan,
  adaptTemplateMeals,
} from "@/features/recommendations/lib/recommendations.functions";
import { getTemplateMealPlan } from "@/features/mealplan/lib/mealplanTemplate.functions";
import { BottomNav } from "@/components/bottom-nav";
import {
  Sparkles,
  Loader2,
  Sunrise,
  Sun,
  Moon,
  Cookie,
  Check,
  RotateCw,
  type LucideIcon,
} from "lucide-react";
import { toast } from "@/lib/toast-config";
import { toastError } from "@/lib/toast-config";

export const Route = createFileRoute("/_authenticated/recommendations")({
  component: RecommendationsPage,
});

const ICONS: Record<string, LucideIcon> = {
  breakfast: Sunrise,
  lunch: Sun,
  dinner: Moon,
  snack: Cookie,
};
const LABELS: Record<string, string> = {
  breakfast: "Sarapan",
  lunch: "Makan Siang",
  dinner: "Makan Malam",
  snack: "Snack",
};

// ──────────────────────────────────────────────────────────────────────
// Sprint 5a (re-introduced): unified plan shape that the UI consumes.
// Server returns `mode: "ai" | "ai_empty"`. On `ai_empty`, the client fires
// a separate `getTemplateMealPlan` call and adapts the result with
// `adaptTemplateMeals`. The UI then renders either path identically, with
// a small badge that tells the user which source produced the plan.
// ──────────────────────────────────────────────────────────────────────
type PlanMealUI = {
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  name: string;
  calories: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  planned_qty: number;
  reason: string;
  food_item_id?: string | null;
};
type PlanUI = {
  mode: "ai" | "template";
  summary: string;
  remaining_budget_kcal: number;
  meals: PlanMealUI[];
};

function RecommendationsPage() {
  const genFn = useServerFn(generateMealPlan);
  const acceptFn = useServerFn(acceptMealPlan);
  const tplFn = useServerFn(getTemplateMealPlan);
  const [notes, setNotes] = useState("");

  const gen = useMutation<PlanUI, Error, { forceAi?: boolean }>({
    mutationFn: async ({ forceAi = false } = {}) => {
      const result = await genFn({ data: { notes: notes || undefined } });

      // AI succeeded → done.
      if (result.mode === "ai") {
        return {
          mode: "ai",
          summary: result.summary,
          remaining_budget_kcal: result.remaining_budget_kcal,
          meals: result.meals as PlanMealUI[],
        };
      }

      // AI empty + user is forcing AI retry → fail fast, don't fall back.
      if (forceAi) {
        throw new Error("AI masih tidak tersedia. Coba lagi sebentar lagi.");
      }

      // AI empty → fetch template as fallback (separate server fn call).
      console.info("[recommendations] AI empty, fetching template fallback");
      const tpl = await tplFn({ data: undefined });
      if (!tpl.template) {
        throw new Error("Layanan AI tidak tersedia dan template kosong. Coba lagi nanti.");
      }
      const adapted = adaptTemplateMeals(tpl.template.meals);
      if (adapted.length === 0) {
        throw new Error("Template tidak punya menu yang valid. Coba lagi nanti.");
      }
      return {
        mode: "template",
        summary: `Template: ${tpl.template.name} — rekomendasi umum berdasarkan profil kalori.`,
        remaining_budget_kcal: tpl.template.target_calories ?? 0,
        meals: adapted as PlanMealUI[],
      };
    },
    onError: (e) => toastError(e, "Gagal"),
  });

  const accept = useMutation({
    mutationFn: () => {
      if (!gen.data) throw new Error("Belum ada rekomendasi");
      return acceptFn({
        data: {
          plan_date: new Date().toISOString().slice(0, 10),
          items: gen.data.meals.map((m) => ({
            meal_type: m.meal_type as "breakfast" | "lunch" | "dinner" | "snack",
            food_item_id: m.food_item_id ?? null,
            custom_name: m.food_item_id ? null : m.name,
            calories: Math.round(m.calories),
            planned_qty: m.planned_qty ?? 1,
          })),
        },
      });
    },
    onSuccess: () => toast.success("Rekomendasi disimpan ke meal plan hari ini"),
    onError: (e) => toastError(e, "Gagal simpan"),
  });

  const totalCal = gen.data?.meals.reduce((s, m) => s + Number(m.calories || 0), 0) ?? 0;

  return (
    <main className="min-h-dvh bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-2 space-y-5">
        <TopAppBar
          title="Rekomendasi AI"
          subtitle="Meal plan personal sesuai profil & sisa kalori"
          showBack
        />

        <section className="bg-card p-4 rounded-3xl outline-1 outline-black/5 space-y-3 animate-fade-up">
          <label className="block text-xs font-semibold text-muted-foreground">
            Catatan khusus (opsional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="cth: ingin yang tinggi protein, mau cepat masak..."
            rows={2}
            className="w-full bg-background rounded-2xl outline-1 outline-black/10 px-3 py-2 text-sm focus:outline-2 focus:outline-primary"
          />
          <button
            onClick={() => gen.mutate({})}
            disabled={gen.isPending}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 rounded-2xl disabled:opacity-60"
          >
            {gen.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {gen.isPending ? "Menyusun rekomendasi..." : "Buat Rekomendasi"}
          </button>
        </section>

        {gen.data && (
          <>
            <section className="bg-card p-4 rounded-3xl outline-1 outline-black/5 animate-fade-up">
              {/* Sprint 5a: dynamic mode badge. Tells the user which source
                  produced the plan (AI vs template fallback). */}
              <div className="flex items-center gap-2 mb-2">
                {gen.data.mode === "ai" ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-1 rounded-full">
                    <Sparkles className="size-3" /> AI Personal
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground px-2 py-1 rounded-full">
                    📋 Template (estimasi)
                  </span>
                )}
              </div>
              <p className="text-sm leading-relaxed">{gen.data.summary}</p>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Sisa budget:{" "}
                  <b className="text-foreground">{gen.data.remaining_budget_kcal} kcal</b>
                </span>
                <span className="text-muted-foreground">
                  Total rencana: <b className="text-foreground">{Math.round(totalCal)} kcal</b>
                </span>
              </div>
              {gen.data.mode === "template" && (
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-xl">
                  <span>AI tidak tersedia. Coba paksa AI lagi?</span>
                  <button
                    onClick={() => gen.mutate({ forceAi: true })}
                    disabled={gen.isPending}
                    className="ml-auto inline-flex items-center gap-1 text-primary font-semibold disabled:opacity-50"
                  >
                    <RotateCw className="size-3" /> Coba AI lagi
                  </button>
                </div>
              )}
            </section>

            <section className="space-y-3 animate-fade-up">
              {gen.data.meals.map((m, i) => {
                const Icon = ICONS[m.meal_type] ?? Cookie;
                return (
                  <div
                    key={i}
                    className="bg-card p-4 rounded-3xl outline-1 outline-black/5 flex gap-3"
                  >
                    <div className="size-11 rounded-2xl bg-primary/10 grid place-items-center shrink-0">
                      <Icon className="size-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {LABELS[m.meal_type]}
                      </p>
                      <p className="font-semibold text-sm">{m.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{m.reason}</p>
                      <div className="flex gap-3 mt-2 text-[11px] tabular-nums">
                        <span>
                          <b>{Math.round(m.calories)}</b> kcal
                        </span>
                        {m.protein_g != null && (
                          <span className="text-muted-foreground">
                            P {Math.round(m.protein_g)}g
                          </span>
                        )}
                        {m.carbs_g != null && (
                          <span className="text-muted-foreground">C {Math.round(m.carbs_g)}g</span>
                        )}
                        {m.fat_g != null && (
                          <span className="text-muted-foreground">F {Math.round(m.fat_g)}g</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>

            <button
              onClick={() => accept.mutate()}
              disabled={accept.isPending}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold py-3 rounded-2xl shadow-lg disabled:opacity-60"
            >
              {accept.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Simpan ke Meal Plan Hari Ini
            </button>
          </>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
