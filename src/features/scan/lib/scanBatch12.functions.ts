import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAiWithGuards, callAiJsonWithSchema } from "@/features/ai/lib/aiGateway.server";

const ImportedRecipeSchema = z
  .object({
    title: z.string().optional(),
    ingredients: z.array(z.string()).default([]),
    steps: z.array(z.string()).default([]),
  })
  ;

const FormCheckSchema = z
  .object({
    score: z.number().optional(),
    mistakes: z.array(z.string()).default([]),
    tips: z.array(z.string()).default([]),
  })
  ;

const NutritionLabelSchema = z.record(z.union([z.string(), z.number()]));

// 9. Weekly leaderboard
export const getWeeklyLeaderboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const monday = new Date();
    const day = monday.getDay() || 7;
    monday.setDate(monday.getDate() - day + 1);
    const week = monday.toISOString().slice(0, 10);
    const { data } = await context.supabase
      .from("weekly_leaderboard")
      .select("user_id, score, rank")
      .eq("week_start", week)
      .order("score", { ascending: false })
      .limit(50);
    return { week, rows: data ?? [] };
  });

export const upsertWeeklyScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ score: z.number().int().min(0).max(100000) }).parse(d))
  .handler(async ({ data, context }) => {
    const monday = new Date();
    const day = monday.getDay() || 7;
    monday.setDate(monday.getDate() - day + 1);
    const week = monday.toISOString().slice(0, 10);
    const { error } = await context.supabase
      .from("weekly_leaderboard")
      .upsert(
        { user_id: context.userId, week_start: week, score: data.score },
        { onConflict: "user_id,week_start" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// 18. Import recipe from URL
export const importRecipeFromUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ url: z.string().url() }).parse(d))
  .handler(async ({ data, context }) => {
    let html = "";
    try {
      const r = await fetch(data.url, { headers: { "User-Agent": "Mozilla/5.0 RecipeBot" } });
      html = (await r.text()).slice(0, 50000);
    } catch (e) {
      throw new Error("Gagal mengambil halaman");
    }
    const parsed = await callAiJsonWithSchema({
      userId: context.userId,
      feature: "recipe.import_from_url",
      schema: ImportedRecipeSchema,
      fallback: { ingredients: [], steps: [] },
      messages: [
        {
          role: "system",
          content:
            "Ekstrak resep dari HTML. Balas JSON: {title, ingredients:[], steps:[]}. Tanpa markdown.",
        },
        { role: "user", content: html },
      ],
    });
    const { data: row } = await context.supabase
      .from("imported_recipes")
      .insert({
        user_id: context.userId,
        source_url: data.url,
        title: parsed.title ?? null,
        ingredients: parsed.ingredients ?? [],
        steps: parsed.steps ?? [],
      })
      .select()
      .single();
    return { recipe: row, parsed };
  });

// 20. Grocery list from meal plan
export const generateGroceryList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ planText: z.string().min(10).max(5000) }).parse(d))
  .handler(async ({ data, context }) => {
    const txt = await callAiWithGuards({
      userId: context.userId,
      feature: "grocery.from_plan",
      messages: [
        {
          role: "system",
          content:
            "Buat daftar belanja dari meal plan. Balas JSON array: [{name, qty, unit}]. Tanpa markdown.",
        },
        { role: "user", content: data.planText },
      ],
    });
    let items: Array<{ name: string; qty?: string; unit?: string }> = [];
    try {
      items = JSON.parse(txt.replace(/^```json|```$/g, "").trim());
    } catch {
      items = [];
    }
    const { data: row } = await context.supabase
      .from("grocery_lists")
      .insert({
        user_id: context.userId,
        source: "mealplan",
        items: items as never,
      })
      .select()
      .single();
    return { list: row };
  });

// 19. Subscription
export const getSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    return { sub: data ?? { tier: "free", status: "active" } };
  });

export const upgradeSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ tier: z.enum(["free", "pro", "ultimate"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const periodEnd = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
    const { error } = await context.supabase
      .from("subscriptions")
      .upsert(
        {
          user_id: context.userId,
          tier: data.tier,
          status: "active",
          current_period_end: periodEnd,
        },
        { onConflict: "user_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true, tier: data.tier };
  });

// 14. Weekly podcast script
export const generateWeeklyPodcast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const monday = new Date();
    const day = monday.getDay() || 7;
    monday.setDate(monday.getDate() - day + 1);
    const week = monday.toISOString().slice(0, 10);
    const { data: meals } = await context.supabase
      .from("meal_logs")
      .select("meal_type,calories,logged_at")
      .eq("user_id", context.userId)
      .gte("logged_at", week);
    const script = await callAiWithGuards({
      userId: context.userId,
      feature: "podcast.weekly",
      messages: [
        {
          role: "system",
          content:
            "Buat skrip podcast mingguan ~150 kata dalam Bahasa Indonesia, motivasional, sebut highlight data.",
        },
        { role: "user", content: `Data meal minggu ini: ${JSON.stringify(meals ?? [])}` },
      ],
    });
    await context.supabase
      .from("weekly_podcasts")
      .upsert(
        { user_id: context.userId, week_start: week, script },
        { onConflict: "user_id,week_start" },
      );
    return { script, week };
  });

// 16. AI workout form check (text-only stub from description)
export const analyzeFormCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({ exercise: z.string().min(1).max(100), description: z.string().min(5).max(2000) })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    let feedback: { score?: number; mistakes?: string[]; tips?: string[]; raw?: string } = {};
    try {
      feedback = await callAiJsonWithSchema({
        userId: context.userId,
        feature: "workout.form_check",
        schema: FormCheckSchema,
        fallback: { mistakes: [], tips: [] },
        messages: [
          {
            role: "system",
            content:
              "Coach fitness. Balas JSON: {score:1-10, mistakes:[], tips:[]}. Tanpa markdown.",
          },
          {
            role: "user",
            content: `Latihan: ${data.exercise}\nDeskripsi gerakan: ${data.description}`,
          },
        ],
      });
    } catch (e) {
      feedback = { raw: (e as Error).message };
    }
    const { data: row } = await context.supabase
      .from("form_check_sessions")
      .insert({
        user_id: context.userId,
        exercise: data.exercise,
        ai_feedback: feedback as never,
      })
      .select()
      .single();
    return { session: row, feedback };
  });

// 11. Nutrition label OCR
export const ocrNutritionLabel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ imageBase64: z.string().min(50) }).parse(d))
  .handler(async ({ data, context }) => {
    let nutrition: Record<string, string | number> = {};
    try {
      nutrition = await callAiJsonWithSchema({
        userId: context.userId,
        feature: "ocr.nutrition_label",
        schema: NutritionLabelSchema,
        fallback: {},
        messages: [
          {
            role: "system",
            content:
              "OCR label nutrisi. Balas JSON: {servingSize, calories, protein_g, carbs_g, fat_g, sugar_g, sodium_mg}. Tanpa markdown.",
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${data.imageBase64}` },
              },
            ],
          },
        ],
      });
    } catch (e) {
      nutrition = { raw: (e as Error).message };
    }
    return { nutrition };
  });

// 17. Mood heatmap data
export const getMoodHeatmap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const yearAgo = new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString();
    const { data } = await context.supabase
      .from("mood_logs")
      .select("mood, logged_at")
      .eq("user_id", context.userId)
      .gte("logged_at", yearAgo);
    const map: Record<string, { sum: number; count: number }> = {};
    (data ?? []).forEach((r: { mood: number | null; logged_at: string }) => {
      const day = r.logged_at.slice(0, 10);
      if (!map[day]) map[day] = { sum: 0, count: 0 };
      map[day].sum += r.mood ?? 0;
      map[day].count += 1;
    });
    return { days: Object.entries(map).map(([d, v]) => ({ date: d, avg: v.sum / v.count })) };
  });
