import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAiJsonWithSchema } from "@/features/ai/lib/aiGateway.server";

const BudgetPlanSchema = z.object({
  days: z
    .array(
      z.object({
        day: z.union([z.string(), z.number()]).optional(),
        meals: z
          .array(
            z.object({
              name: z.string().default(""),
              est_idr: z.number().optional(),
              calories: z.number().optional(),
            }),
          )
          .default([]),
      }),
    )
    .default([]),
});
const FridgeRecipesSchema = z.object({
  ingredients: z.array(z.string()).default([]),
  recipes: z
    .array(
      z.object({
        name: z.string().default(""),
        steps: z.array(z.string()).default([]),
      }),
    )
    .default([]),
});
// Sleep diary
export const upsertSleepDiary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        diaryDate: z.string(),
        bedtime: z.string().optional(),
        wakeTime: z.string().optional(),
        quality: z.number().int().min(1).max(5).optional(),
        notes: z.string().max(1000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("sleep_diary")
      .upsert(
        {
          user_id: context.userId,
          diary_date: data.diaryDate,
          bedtime: data.bedtime ?? null,
          wake_time: data.wakeTime ?? null,
          quality: data.quality ?? null,
          notes: data.notes ?? null,
        },
        { onConflict: "user_id,diary_date" },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { entry: row };
  });

export const listSleepDiary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("sleep_diary")
      .select("*")
      .eq("user_id", context.userId)
      .order("diary_date", { ascending: false })
      .limit(30);
    return { entries: data ?? [] };
  });

// Workout timer
export const logWorkoutTimer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        exerciseName: z.string().min(1).max(100),
        totalSeconds: z.number().int().min(1),
        rounds: z.number().int().min(1).default(1),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("workout_timer_sessions")
      .insert({
        user_id: context.userId,
        exercise_name: data.exerciseName,
        total_seconds: data.totalSeconds,
        rounds: data.rounds,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { session: row };
  });

// Charity donation
export const donateCoins = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        coins: z.number().int().min(10).max(10000),
        charityName: z.string().min(1).max(100),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: prof } = await supabase
      .from("profiles")
      .select("health_coins")
      .eq("id", userId)
      .single();
    if (!prof || (prof.health_coins ?? 0) < data.coins) throw new Error("Coin tidak cukup");
    const { data: row, error } = await supabase
      .from("charity_donations")
      .insert({ user_id: userId, coins_spent: data.coins, charity_name: data.charityName })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await supabase
      .from("profiles")
      .update({ health_coins: (prof.health_coins ?? 0) - data.coins })
      .eq("id", userId);
    return { donation: row };
  });

// Showcase reorder
export const reorderShowcase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ order: z.array(z.string().uuid()).max(20) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("achievement_showcase_order").delete().eq("user_id", userId);
    if (data.order.length) {
      const rows = data.order.map((aid, i) => ({
        user_id: userId,
        achievement_id: aid,
        position: i,
      }));
      const { error } = await supabase.from("achievement_showcase_order").insert(rows);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// Budget meal plan AI
export const generateBudgetMealPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        budgetIdr: z.number().int().min(10000).max(10000000),
        days: z.number().int().min(1).max(14),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const parsed = await callAiJsonWithSchema({
      userId: context.userId,
      feature: "mealplan.budget",
      schema: BudgetPlanSchema,
      fallback: { days: [] },
      messages: [
        {
          role: "system",
          content:
            "Kamu ahli gizi & budget Indonesia. Jawab JSON {days:[{day, meals:[{name, est_idr, calories}]}]} dengan total mendekati budget.",
        },
        {
          role: "user",
          content: `Budget total: Rp ${data.budgetIdr} untuk ${data.days} hari. 3 meal/hari. Gunakan bahan lokal murah.`,
        },
      ],
    });
    const planStr = JSON.stringify(parsed ?? {});
    await context.supabase.from("budget_meal_plans").insert({
      user_id: context.userId,
      budget_idr: data.budgetIdr,
      days: data.days,
      plan: parsed as never,
    });
    return { planJson: planStr };
  });

// Recipe from fridge photo (AI)
export const recipeFromFridge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ imageBase64: z.string().min(10) }).parse(d))
  .handler(async ({ data, context }) => {
    const result = await callAiJsonWithSchema({
      userId: context.userId,
      feature: "recipe.from_fridge",
      schema: FridgeRecipesSchema,
      fallback: { ingredients: [], recipes: [] },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Lihat foto kulkas ini. Identifikasi bahan dan saran 3 resep. JSON {ingredients:[], recipes:[{name, steps:[]}]}.",
            },
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${data.imageBase64}` },
            },
          ],
        },
      ],
    });
    return { result };
  });
