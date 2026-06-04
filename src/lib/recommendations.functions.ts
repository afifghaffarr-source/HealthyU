import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Lightweight content personalization: score published articles & recipes
 * against user profile (goals, conditions, dietary_preference, BMI). No AI
 * call — pure ranking on already-loaded rows.
 */
export const getRecommendedContent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("dietary_preference, health_conditions, bmi_category, daily_calorie_target")
      .eq("id", userId)
      .maybeSingle();

    const conds = (profile?.health_conditions ?? []).map((c) => c.toLowerCase());
    const diet = (profile?.dietary_preference ?? "").toLowerCase();
    const bmiCat = (profile?.bmi_category ?? "").toLowerCase();
    const calTarget = profile?.daily_calorie_target ?? 0;

    const [{ data: arts }, { data: recs }, { data: schedule }] = await Promise.all([
      supabase
        .from("articles")
        .select(
          "id, slug, title, excerpt, image_url, category, tags, target_conditions, target_goals, reading_time_minutes, is_featured, published_at",
        )
        .eq("is_published", true)
        .is("deleted_at", null)
        .order("published_at", { ascending: false })
        .limit(60),
      supabase
        .from("recipes")
        .select(
          "id, slug, title, description, category, calories, tags, is_vegetarian, is_vegan, is_keto_friendly, is_halal, image_url, avg_rating, save_count",
        )
        .eq("is_published", true)
        .is("deleted_at", null)
        .order("save_count", { ascending: false })
        .limit(60),
      supabase
        .from("daily_content_schedule")
        .select("content_type, content_id, theme")
        .eq("schedule_date", new Date().toISOString().slice(0, 10)),
    ]);

    const todayIds = new Set((schedule ?? []).map((s) => s.content_id));

    function scoreArticle(a: NonNullable<typeof arts>[number]): number {
      let s = 0;
      if (todayIds.has(a.id)) s += 50;
      if (a.is_featured) s += 10;
      const tags = Array.isArray(a.tags) ? (a.tags as unknown[]).map(String) : [];
      const targets = Array.isArray(a.target_conditions)
        ? (a.target_conditions as unknown[]).map(String).map((x) => x.toLowerCase())
        : [];
      for (const c of conds)
        if (targets.includes(c) || tags.some((t) => t.toLowerCase().includes(c))) s += 15;
      if (bmiCat === "overweight" || bmiCat === "obese") {
        if (a.category === "diet" || a.category === "fitness") s += 8;
      }
      if (bmiCat === "underweight" && a.category === "nutrition") s += 8;
      if (diet && tags.map((t) => t.toLowerCase()).includes(diet)) s += 5;
      return s;
    }

    function scoreRecipe(r: NonNullable<typeof recs>[number]): number {
      let s = 0;
      if (todayIds.has(r.id)) s += 50;
      s += Math.min(20, (r.avg_rating ?? 0) * 4);
      if (diet === "vegetarian" && r.is_vegetarian) s += 12;
      if (diet === "vegan" && r.is_vegan) s += 14;
      if (diet === "keto" && r.is_keto_friendly) s += 14;
      if (diet === "halal" && r.is_halal) s += 6;
      if (calTarget > 0 && r.calories > 0) {
        const portion = calTarget / 3; // ~per meal
        const diff = Math.abs(r.calories - portion) / portion;
        if (diff < 0.3) s += 10;
        else if (diff < 0.5) s += 5;
      }
      if (bmiCat === "overweight" || bmiCat === "obese") {
        if (r.calories > 0 && r.calories < 450) s += 6;
      }
      return s;
    }

    const articles = (arts ?? [])
      .map((a) => ({ ...a, _score: scoreArticle(a) }))
      .sort((a, b) => b._score - a._score)
      .slice(0, 12);

    const recipes = (recs ?? [])
      .map((r) => ({ ...r, _score: scoreRecipe(r) }))
      .sort((a, b) => b._score - a._score)
      .slice(0, 12);

    return {
      today_theme: schedule?.[0]?.theme ?? null,
      articles,
      recipes,
    };
  });

/* -------------------------------------------------------------------------- */
/* AI Meal Plan generation (used by /recommendations route)                   */
/* -------------------------------------------------------------------------- */

type PlanMeal = {
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  name: string;
  food_item_id?: string | null;
  planned_qty?: number;
  calories: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  reason: string;
};
type PlanResult = {
  summary: string;
  remaining_budget_kcal: number;
  meals: PlanMeal[];
};

const GenInput = z.object({ notes: z.string().max(500).optional() });

export const generateMealPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => GenInput.parse(i))
  .handler(async ({ data, context }): Promise<PlanResult> => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);

    const [{ data: profile }, { data: planned }] = await Promise.all([
      supabase
        .from("profiles")
        .select("daily_calorie_target, dietary_preference, health_conditions, bmi_category")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("meal_plans")
        .select("calories, planned_qty")
        .eq("user_id", userId)
        .eq("plan_date", today),
    ]);

    const target = profile?.daily_calorie_target ?? 2000;
    const consumed = (planned ?? []).reduce(
      (s, r) => s + Number(r.calories ?? 0) * Number(r.planned_qty ?? 1),
      0,
    );
    const remaining = Math.max(300, Math.round(target - consumed));

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const system =
      "Anda ahli gizi HealthyU. Susun rencana 3-4 menu Indonesia untuk sisa hari ini. " +
      "Output HANYA JSON valid: " +
      '{"summary":"...","meals":[{"meal_type":"breakfast|lunch|dinner|snack","name":"...","calories":<int>,"protein_g":<num>,"carbs_g":<num>,"fat_g":<num>,"planned_qty":1,"reason":"singkat"}]}. ' +
      "Total kalori meals harus ≤ budget. Pertimbangkan preferensi diet & kondisi kesehatan.";
    const user =
      `Sisa budget kalori: ${remaining} kcal\n` +
      `Preferensi diet: ${profile?.dietary_preference ?? "tidak ada"}\n` +
      `Kondisi: ${(profile?.health_conditions ?? []).join(", ") || "tidak ada"}\n` +
      `Kategori BMI: ${profile?.bmi_category ?? "-"}\n` +
      (data.notes ? `Catatan user: ${data.notes}\n` : "");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_tokens: 900,
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`AI gateway ${res.status}: ${t.slice(0, 200)}`);
    }
    const json = await res.json();
    const text: string = json?.choices?.[0]?.message?.content ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI response tidak valid");
    let parsed: { summary?: string; meals?: PlanMeal[] };
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      throw new Error("AI response gagal diparse");
    }
    const meals = Array.isArray(parsed.meals) ? parsed.meals : [];
    return {
      summary: parsed.summary ?? "Rekomendasi siap.",
      remaining_budget_kcal: remaining,
      meals,
    };
  });

const AcceptInput = z.object({
  plan_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  items: z
    .array(
      z.object({
        meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
        food_item_id: z.string().uuid().nullable().optional(),
        custom_name: z.string().max(200).nullable().optional(),
        calories: z.number().min(0).max(5000),
        planned_qty: z.number().min(0.1).max(20).optional(),
      }),
    )
    .min(1)
    .max(12),
});

export const acceptMealPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => AcceptInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const rows = data.items.map((it) => ({
      user_id: userId,
      plan_date: data.plan_date,
      meal_type: it.meal_type,
      food_item_id: it.food_item_id ?? null,
      custom_name: it.custom_name ?? null,
      calories: it.calories,
      planned_qty: it.planned_qty ?? 1,
      plan_type: "ai",
    }));
    const { error } = await supabase.from("meal_plans").insert(rows);
    if (error) throw new Error(error.message);
    return { ok: true, inserted: rows.length };
  });
