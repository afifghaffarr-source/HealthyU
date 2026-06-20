import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAiJsonWithSchema } from "@/features/ai/lib/aiGateway.server";

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

/**
 * Sprint 5a (re-introduced): discriminated union for `generateMealPlan`.
 * The AI path lives entirely in the server fn. If AI returns empty/invalid,
 * the server signals the client with `mode: "ai_empty"` — the CLIENT then
 * fires a separate `getTemplateMealPlan` call. This avoids the internal
 * RPC bug that bit us in the first Sprint 5a attempt (server fn hash
 * not registered in worker manifest → "Server function info not found").
 */
type PlanResult =
  | {
      mode: "ai";
      summary: string;
      remaining_budget_kcal: number;
      meals: PlanMeal[];
    }
  | {
      mode: "ai_empty";
      reason: string;
      remaining_budget_kcal: number;
    };
// ──────────────────────────────────────────────────────────────────────────
// Zod schemas (Sprint 5a) — exported for unit testability
// ──────────────────────────────────────────────────────────────────────────
//
// SPRINT 5A FIXES (2026-06-20): schemas are LENIENT — accept common AI
// aliases. Different models return different field names:
//   - meal_type ↔ type      (case-insensitive: "Breakfast" → "breakfast")
//   - reason ↔ notes ↔ description
//   - planned_qty ↔ servings (defaults to 1)
//   - meal_type MISSING entirely → infer from position in array
//
// Verified against real gpt-oss-120b production response (2026-06-20 curl):
// uses `description` + `servings`, no `meal_type` at all.
// ──────────────────────────────────────────────────────────────────────────

const MEAL_TYPE_VALUES = ["breakfast", "lunch", "dinner", "snack"] as const;

/**
 * Normalize a meal in the context of an array (for `PlanResultSchema`).
 * Infers `meal_type` from array position when missing entirely.
 */
function normalizeMealInArray(input: unknown, index: number): unknown {
  if (!input || typeof input !== "object") return input;
  const m = input as Record<string, unknown>;

  let meal_type: string | undefined;
  if (m.meal_type !== undefined) {
    meal_type = typeof m.meal_type === "string" ? m.meal_type.toLowerCase().trim() : undefined;
  } else if (m.type !== undefined) {
    meal_type = typeof m.type === "string" ? m.type.toLowerCase().trim() : undefined;
  } else {
    // No meal_type at all → infer from position in array.
    // meals[0]=breakfast, [1]=lunch, [2]=dinner, [3]=snack, [4+]=lunch
    meal_type = ["breakfast", "lunch", "dinner", "snack"][index] ?? "lunch";
  }

  return {
    ...m,
    meal_type,
    reason: m.reason ?? m.notes ?? m.description ?? "",
    planned_qty: m.planned_qty ?? m.servings ?? 1,
  };
}

/**
 * Normalize a single meal (for `PlanMealSchema` direct parse).
 * Does NOT infer meal_type from position — if the caller has a single meal
 * without meal_type, that's a programming error and should fail validation.
 */
function normalizeMealSingle(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;
  const m = input as Record<string, unknown>;

  // meal_type: prefer `meal_type`, fall back to `type` (case-insensitive).
  // Caller must provide one — schema will reject if missing or invalid.
  let meal_type: string | undefined;
  if (m.meal_type !== undefined) {
    meal_type = typeof m.meal_type === "string" ? m.meal_type.toLowerCase().trim() : undefined;
  } else if (m.type !== undefined) {
    meal_type = typeof m.type === "string" ? m.type.toLowerCase().trim() : undefined;
  }
  // Note: if both undefined, meal_type stays undefined and Zod will reject.

  return {
    ...m,
    meal_type,
    reason: m.reason ?? m.notes ?? m.description ?? "",
    planned_qty: m.planned_qty ?? m.servings ?? 1,
  };
}

export const PlanMealSchema = z.preprocess(
  normalizeMealSingle,
  z.object({
    meal_type: z.enum(MEAL_TYPE_VALUES),
    name: z.string().min(1).max(200),
    calories: z.number().int().nonnegative().max(5000),
    protein_g: z.number().nonnegative().optional(),
    carbs_g: z.number().nonnegative().optional(),
    fat_g: z.number().nonnegative().optional(),
    planned_qty: z.number().min(0.1).max(20).default(1),
    reason: z.string().max(200).default(""),
  }),
);

export const PlanResultSchema = z.preprocess(
  (val) => {
    if (!val || typeof val !== "object") return val;
    const r = val as Record<string, unknown>;
    if (!Array.isArray(r.meals)) return val;
    const meals = r.meals as unknown[];
    return {
      ...r,
      meals: meals.map((m, i) => normalizeMealInArray(m, i)),
    };
  },
  z.object({
    summary: z.string().min(1).max(500),
    meals: z.array(PlanMealSchema).min(1).max(8),
  }),
);

const GenInput = z.object({ notes: z.string().max(500).optional() });

/**
 * Pure helper: adapt a `meal_plan_templates.meals` row (typed as `Json` in
 * Supabase) into the canonical `PlanMeal[]` shape. Filters out entries that
 * don't match the expected shape. Exported for unit testing.
 */
export function adaptTemplateMeals(tplMeals: unknown): PlanMeal[] {
  if (!Array.isArray(tplMeals)) return [];
  return (tplMeals as unknown[])
    .filter((m): m is { meal_type: PlanMeal["meal_type"]; name: string; calories: number } => {
      if (!m || typeof m !== "object") return false;
      const r = m as Record<string, unknown>;
      return (
        typeof r.meal_type === "string" &&
        (r.meal_type === "breakfast" ||
          r.meal_type === "lunch" ||
          r.meal_type === "dinner" ||
          r.meal_type === "snack") &&
        typeof r.name === "string" &&
        r.name.length > 0 &&
        typeof r.calories === "number" &&
        r.calories >= 0
      );
    })
    .map((m) => ({
      meal_type: m.meal_type,
      name: m.name,
      calories: m.calories,
      planned_qty: 1,
      reason: "Rekomendasi template (AI tidak tersedia)",
    }));
}

/**
 * Pure helper: gate that decides whether the AI returned a usable plan.
 * Exported for unit testing.
 */
export function isUsablePlan(
  parsed: { summary: string; meals: unknown[] } | null | undefined,
): parsed is { summary: string; meals: PlanMeal[] } {
  return !!parsed && Array.isArray(parsed.meals) && parsed.meals.length > 0;
}

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

    // SPRINT 5A FIX 2 (2026-06-20): explicit field names. Earlier prompt
    // was vague ("Output HANYA JSON valid sesuai schema") and the model
    // invented its own field names (`description`, `servings`, no
    // `meal_type`). Specifying the exact JSON structure with example
    // field names dramatically improves schema-first passes.
    const system =
      "Anda ahli gizi HealthyU. Susun rencana 3-4 menu Indonesia untuk sisa hari ini. " +
      "Pertimbangkan preferensi diet, kondisi kesehatan (diabetes/hipertensi/dll), dan kategori BMI. " +
      "Total kalori semua meals harus <= budget. Berikan estimasi makro (protein/carbs/fat) realistis.\n\n" +
      "OUTPUT WAJIB JSON valid dengan struktur PERSIS seperti ini (field names HARUS sama):\n" +
      "{\n" +
      '  "summary": "string 1-2 kalimat",\n' +
      '  "meals": [\n' +
      "    {\n" +
      '      "meal_type": "breakfast" | "lunch" | "dinner" | "snack",\n' +
      '      "name": "nama menu dalam bahasa Indonesia",\n' +
      '      "calories": <integer>,\n' +
      '      "protein_g": <number>,\n' +
      '      "carbs_g": <number>,\n' +
      '      "fat_g": <number>,\n' +
      '      "reason": "alasan singkat kenapa menu ini dipilih"\n' +
      "    }\n" +
      "  ]\n" +
      "}\n\n" +
      "PENTING:\n" +
      "- meal_type HARUS salah satu dari: breakfast, lunch, dinner, snack (lowercase, no other values)\n" +
      "- calories HARUS integer (bukan desimal)\n" +
      "- reason WAJIB ada, jangan kosong\n" +
      "- Output HANYA JSON, tanpa markdown, tanpa code block, tanpa teks tambahan.";
    const user =
      `Sisa budget kalori: ${remaining} kcal\n` +
      `Preferensi diet: ${profile?.dietary_preference ?? "tidak ada"}\n` +
      `Kondisi: ${(profile?.health_conditions ?? []).join(", ") || "tidak ada"}\n` +
      `Kategori BMI: ${profile?.bmi_category ?? "-"}\n` +
      (data.notes ? `Catatan user: ${data.notes}\n` : "");

    // Sprint 5a: route through callAiJsonWithSchema (Zod-validated). Empty
    // fallback signals "no usable AI output" → return mode: "ai_empty" so
    // the CLIENT can decide to fetch a template (separate server fn call,
    // no internal RPC between server fns).
    const EMPTY: z.infer<typeof PlanResultSchema> = { summary: "", meals: [] };
    const parsed = await callAiJsonWithSchema({
      userId,
      feature: "mealplan.generate",
      maxTokens: 1200,
      schema: PlanResultSchema,
      fallback: EMPTY,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    if (isUsablePlan(parsed)) {
      return {
        mode: "ai",
        summary: parsed.summary,
        remaining_budget_kcal: remaining,
        meals: parsed.meals,
      };
    }

    // AI returned empty/invalid → tell the client to fetch template.
    // The client (`recommendations.tsx`) will fire `getTemplateMealPlan`
    // as a separate request and adapt the template via `adaptTemplateMeals`.
    console.warn(
      `[recommendations.generateMealPlan] AI returned empty/invalid, signaling client fallback for userId=${userId}`,
    );
    return {
      mode: "ai_empty",
      reason:
        "Layanan AI tidak mengembalikan rekomendasi yang valid. Coba lagi, atau lihat template yang tersedia.",
      remaining_budget_kcal: remaining,
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
