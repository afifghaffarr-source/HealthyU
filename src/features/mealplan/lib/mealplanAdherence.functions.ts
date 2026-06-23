/**
 * Sprint 6 — Meal Plan enhancement
 * Server functions:
 *  - swapMeal            → regenerate one meal (AI), audit via swapped_from_id
 *  - getAdherenceStats   → 7-day planned vs logged + per-meal-type breakdown
 *  - getAdherenceStreak  → consecutive days with adherence >= threshold
 *  - duplicateLastWeek   → copy prior week plan → this week
 *  - updatePlanNote      → user edits note per meal
 *  - updatePlanTags      → user adds tags (e.g. favorite, high-protein)
 *
 * Catatan: kita pakai VexoAI gateway yang sama dengan recommendations.
 * Swap = kirim 1 meal request ke AI (bukan full plan), lebih murah.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAiJsonWithSchema } from "@/features/ai/lib/aiGateway.server";
import {
  PlanMealSchema,
  type PlanMeal,
} from "@/features/recommendations/lib/recommendations.functions";

const SwapResultSchema = z.object({
  meal: PlanMealSchema,
});

// ────────────────────────────────────────────────────────────────────
// swapMeal — regenerate one meal in place, keep original as audit
// ────────────────────────────────────────────────────────────────────
const SwapInput = z.object({
  plan_id: z.string().uuid(),
});

export const swapMeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => SwapInput.parse(i))
  .handler(async ({ data, context }): Promise<{ ok: true; new_id: string }> => {
    const { supabase, userId } = context;

    // 1. Load original meal
    const { data: orig, error: loadErr } = await supabase
      .from("meal_plans")
      .select("*")
      .eq("id", data.plan_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (loadErr) throw new Error(loadErr.message);
    if (!orig) throw new Error("Plan tidak ditemukan");

    // 2. Load user profile untuk context
    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "daily_calorie_target, dietary_preference, health_conditions, bmi_category, allergies",
      )
      .eq("id", userId)
      .maybeSingle();

    // 3. Hitung remaining calories utk hari itu (exclude meal ini)
    const { data: otherPlanned } = await supabase
      .from("meal_plans")
      .select("calories, planned_qty")
      .eq("user_id", userId)
      .eq("plan_date", orig.plan_date)
      .neq("id", orig.id);
    const consumed =
      otherPlanned?.reduce((s, r) => s + Number(r.calories ?? 0) * Number(r.planned_qty ?? 1), 0) ??
      0;
    const target = profile?.daily_calorie_target ?? 2000;
    const remaining = Math.max(150, Math.round(target - consumed));

    // 4. AI generate 1 meal replacement
    const system =
      "Anda ahli gizi HealthyU. User ingin MENGGANTI 1 meal plan existing " +
      `(${orig.meal_type}). Buatkan 1 alternatif menu Indonesia yang berbeda dari "${orig.custom_name ?? "menu sebelumnya"}". ` +
      "Pertimbangkan preferensi diet, kondisi kesehatan, dan kalori yang tersedia. " +
      "Berikan estimasi makro realistis.\n\n" +
      "OUTPUT WAJIB JSON valid:\n" +
      "{\n" +
      '  "meal": {\n' +
      '    "meal_type": "breakfast" | "lunch" | "dinner" | "snack",\n' +
      '    "name": "nama menu dalam bahasa Indonesia",\n' +
      '    "calories": <integer>,\n' +
      '    "protein_g": <number>,\n' +
      '    "carbs_g": <number>,\n' +
      '    "fat_g": <number>,\n' +
      '    "reason": "alasan singkat kenapa alternatif ini dipilih"\n' +
      "  }\n" +
      "}\n\n" +
      "PENTING: meal_type HARUS sama dengan yang diganti. Output HANYA JSON, tanpa markdown.";

    const user =
      `Sisa budget kalori: ${remaining} kcal\n` +
      `Meal yang diganti: ${orig.meal_type} — ${orig.custom_name ?? "menu sebelumnya"}\n` +
      `Preferensi diet: ${profile?.dietary_preference ?? "tidak ada"}\n` +
      `Kondisi: ${(profile?.health_conditions ?? []).join(", ") || "tidak ada"}\n` +
      `Kategori BMI: ${profile?.bmi_category ?? "-"}`;

    const EMPTY: z.infer<typeof SwapResultSchema> = {
      meal: {
        meal_type: orig.meal_type as PlanMeal["meal_type"],
        name: "",
        calories: 0,
        reason: "",
        planned_qty: 1,
      },
    };
    const parsed = await callAiJsonWithSchema({
      userId,
      feature: "mealplan.swap",
      maxTokens: 600,
      schema: SwapResultSchema,
      fallback: EMPTY,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    if (!parsed.meal?.name) {
      throw new Error("AI tidak menghasilkan alternatif. Coba lagi.");
    }

    // 5. Insert new row, link to original via swapped_from_id
    // Cast to never for new columns (note/tags/confidence) — types regenerate
    // on next `supabase gen types`.
    const { data: newRow, error: insErr } = await supabase
      .from("meal_plans")
      .insert({
        user_id: userId,
        plan_date: orig.plan_date,
        meal_type: orig.meal_type,
        food_item_id: null,
        custom_name: parsed.meal.name,
        calories: Math.round(parsed.meal.calories),
        planned_qty: orig.planned_qty,
        plan_type: "ai",
        swapped_from_id: orig.id,
        confidence: "medium",
        reason: parsed.meal.reason,
      } as never)
      .select("id")
      .single();
    if (insErr) throw new Error(insErr.message);

    return { ok: true, new_id: newRow.id };
  });

// ────────────────────────────────────────────────────────────────────
// getAdherenceStats — 7-day planned vs logged, plus per-meal-type
// ────────────────────────────────────────────────────────────────────
const AdherenceInput = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  days: z.number().int().min(1).max(30).default(7),
});

type DayAdherence = {
  date: string;
  planned_kcal: number;
  actual_kcal: number;
  adherence_pct: number;
  planned_meals: number;
  logged_meals: number;
};

type MealTypeAdherence = {
  meal_type: string;
  planned: number;
  logged: number;
  adherence_pct: number;
};

type AdherenceStats = {
  window: { start: string; end: string; days: number };
  days: DayAdherence[];
  totals: {
    planned_kcal: number;
    actual_kcal: number;
    adherence_pct: number;
    meals_planned: number;
    meals_logged: number;
    meals_adherence_pct: number;
  };
  by_meal_type: MealTypeAdherence[];
  best_day: DayAdherence | null;
  worst_day: DayAdherence | null;
};

export const getAdherenceStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => AdherenceInput.parse(i))
  .handler(async ({ data, context }): Promise<AdherenceStats> => {
    const { supabase, userId } = context;
    const start = new Date(data.start_date + "T00:00:00Z");
    const end = new Date(start.getTime() + data.days * 86400000);
    const endStr = end.toISOString().slice(0, 10);

    // 1. Pull planned (meal_plans) untuk window
    const { data: planned } = await supabase
      .from("meal_plans")
      .select("plan_date, meal_type, calories, planned_qty")
      .eq("user_id", userId)
      .gte("plan_date", data.start_date)
      .lt("plan_date", endStr);

    // 2. Pull logged (meal_logs) untuk window
    const { data: logged } = await supabase
      .from("meal_logs")
      .select("logged_at, meal_type, calories")
      .eq("user_id", userId)
      .gte("logged_at", data.start_date)
      .lt("logged_at", endStr + "T23:59:59Z");

    // 3. Aggregate per-day
    const byDate = new Map<
      string,
      {
        planned_kcal: number;
        actual_kcal: number;
        planned_meals: number;
        logged_meals: number;
      }
    >();

    for (const p of planned ?? []) {
      const d = p.plan_date;
      if (!byDate.has(d))
        byDate.set(d, {
          planned_kcal: 0,
          actual_kcal: 0,
          planned_meals: 0,
          logged_meals: 0,
        });
      const e = byDate.get(d)!;
      e.planned_kcal += Number(p.calories ?? 0) * Number(p.planned_qty ?? 1);
      e.planned_meals += 1;
    }

    for (const l of logged ?? []) {
      const d = (l.logged_at as string).slice(0, 10);
      if (!byDate.has(d))
        byDate.set(d, {
          planned_kcal: 0,
          actual_kcal: 0,
          planned_meals: 0,
          logged_meals: 0,
        });
      const e = byDate.get(d)!;
      e.actual_kcal += Number(l.calories ?? 0);
      e.logged_meals += 1;
    }

    const days: DayAdherence[] = Array.from(byDate.entries())
      .map(([date, e]) => ({
        date,
        planned_kcal: Math.round(e.planned_kcal),
        actual_kcal: Math.round(e.actual_kcal),
        planned_meals: e.planned_meals,
        logged_meals: e.logged_meals,
        adherence_pct: e.planned_kcal > 0 ? Math.round((e.actual_kcal / e.planned_kcal) * 100) : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 4. Totals
    const totals = days.reduce(
      (s, d) => ({
        planned_kcal: s.planned_kcal + d.planned_kcal,
        actual_kcal: s.actual_kcal + d.actual_kcal,
        meals_planned: s.meals_planned + d.planned_meals,
        meals_logged: s.meals_logged + d.logged_meals,
      }),
      { planned_kcal: 0, actual_kcal: 0, meals_planned: 0, meals_logged: 0 },
    );

    // 5. Per-meal-type breakdown
    const byType = new Map<string, { planned: number; logged: number }>();
    for (const p of planned ?? []) {
      const t = p.meal_type as string;
      if (!byType.has(t)) byType.set(t, { planned: 0, logged: 0 });
      byType.get(t)!.planned += 1;
    }
    for (const l of logged ?? []) {
      const t = l.meal_type as string;
      if (!byType.has(t)) byType.set(t, { planned: 0, logged: 0 });
      byType.get(t)!.logged += 1;
    }
    const by_meal_type: MealTypeAdherence[] = Array.from(byType.entries())
      .map(([meal_type, e]) => ({
        meal_type,
        planned: e.planned,
        logged: e.logged,
        adherence_pct: e.planned > 0 ? Math.round((e.logged / e.planned) * 100) : 0,
      }))
      .sort((a, b) => b.planned - a.planned);

    // 6. Best/worst (by adherence %)
    const daysWithPlan = days.filter((d) => d.planned_kcal > 0);
    const best_day =
      daysWithPlan.length > 0
        ? daysWithPlan.reduce((a, b) => (a.adherence_pct > b.adherence_pct ? a : b))
        : null;
    const worst_day =
      daysWithPlan.length > 0
        ? daysWithPlan.reduce((a, b) => (a.adherence_pct < b.adherence_pct ? a : b))
        : null;

    return {
      window: { start: data.start_date, end: endStr, days: data.days },
      days,
      totals: {
        ...totals,
        adherence_pct:
          totals.planned_kcal > 0
            ? Math.round((totals.actual_kcal / totals.planned_kcal) * 100)
            : 0,
        meals_adherence_pct:
          totals.meals_planned > 0
            ? Math.round((totals.meals_logged / totals.meals_planned) * 100)
            : 0,
      },
      by_meal_type,
      best_day,
      worst_day,
    };
  });

// ────────────────────────────────────────────────────────────────────
// getAdherenceStreak — consecutive days with adherence >= threshold
// ────────────────────────────────────────────────────────────────────
const StreakInput = z.object({
  threshold: z.number().int().min(50).max(100).default(80),
  lookback_days: z.number().int().min(7).max(90).default(30),
});

export const getAdherenceStreak = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => StreakInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    const lookbackStart = new Date(Date.now() - data.lookback_days * 86400000)
      .toISOString()
      .slice(0, 10);

    // Query planned vs logged grouped per day
    const { data: planned } = await supabase
      .from("meal_plans")
      .select("plan_date, calories, planned_qty")
      .eq("user_id", userId)
      .gte("plan_date", lookbackStart)
      .lte("plan_date", today);

    const { data: logged } = await supabase
      .from("meal_logs")
      .select("logged_at, calories")
      .eq("user_id", userId)
      .gte("logged_at", lookbackStart)
      .lte("logged_at", today + "T23:59:59Z");

    const byDate = new Map<string, { p: number; a: number }>();
    for (const p of planned ?? []) {
      const d = p.plan_date;
      if (!byDate.has(d)) byDate.set(d, { p: 0, a: 0 });
      byDate.get(d)!.p += Number(p.calories ?? 0) * Number(p.planned_qty ?? 1);
    }
    for (const l of logged ?? []) {
      const d = (l.logged_at as string).slice(0, 10);
      if (!byDate.has(d)) byDate.set(d, { p: 0, a: 0 });
      byDate.get(d)!.a += Number(l.calories ?? 0);
    }

    // Walk back from today
    let streak = 0;
    const cursor = new Date(today + "T00:00:00Z");
    for (let i = 0; i < data.lookback_days; i++) {
      const d = cursor.toISOString().slice(0, 10);
      const e = byDate.get(d);
      if (!e || e.p === 0) break; // no plan → break streak
      const pct = (e.a / e.p) * 100;
      if (pct < data.threshold) break;
      streak += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }

    return {
      streak,
      threshold: data.threshold,
      lookback_days: data.lookback_days,
    };
  });

// ────────────────────────────────────────────────────────────────────
// duplicateLastWeek — copy prior week plan → this week
// ────────────────────────────────────────────────────────────────────
export const duplicateLastWeek = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    const lastWeekStart = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const lastWeekEnd = new Date(Date.now() - 1 * 86400000).toISOString().slice(0, 10);

    const { data: prior, error } = await supabase
      .from("meal_plans")
      .select("plan_date, meal_type, food_item_id, custom_name, calories, planned_qty, plan_type")
      .eq("user_id", userId)
      .gte("plan_date", lastWeekStart)
      .lte("plan_date", lastWeekEnd);
    if (error) throw new Error(error.message);

    if (!prior || prior.length === 0) {
      throw new Error("Tidak ada meal plan minggu lalu untuk diduplikasi");
    }

    // Hitung offset: misal prior week = 2026-06-16..2026-06-22 → map ke today..today+6
    const offsetDays = Math.floor(
      (new Date(today).getTime() - new Date(lastWeekStart).getTime()) / 86400000,
    );
    const rows = prior.map((p) => {
      const d = new Date(p.plan_date + "T00:00:00Z");
      d.setUTCDate(d.getUTCDate() + offsetDays);
      return {
        user_id: userId,
        plan_date: d.toISOString().slice(0, 10),
        meal_type: p.meal_type,
        food_item_id: p.food_item_id,
        custom_name: p.custom_name,
        calories: p.calories,
        planned_qty: p.planned_qty,
        plan_type: p.plan_type,
      };
    }) as never[];

    const { error: insErr } = await supabase.from("meal_plans").insert(rows);
    if (insErr) throw new Error(insErr.message);

    return { ok: true, inserted: rows.length };
  });

// ────────────────────────────────────────────────────────────────────
// updatePlanNote — user edits note per meal
// ────────────────────────────────────────────────────────────────────
const NoteInput = z.object({
  plan_id: z.string().uuid(),
  note: z.string().max(500).nullable(),
});

export const updatePlanNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => NoteInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("meal_plans")
      .update({ note: data.note } as never)
      .eq("id", data.plan_id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ────────────────────────────────────────────────────────────────────
// updatePlanTags — user adds tags (e.g. favorite, high-protein)
// ────────────────────────────────────────────────────────────────────
const TagsInput = z.object({
  plan_id: z.string().uuid(),
  tags: z.array(z.string().min(1).max(20)).max(8),
});

export const updatePlanTags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => TagsInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("meal_plans")
      .update({ tags: data.tags } as never)
      .eq("id", data.plan_id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
