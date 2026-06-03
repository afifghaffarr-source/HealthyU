import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Sleep diary
export const upsertSleepDiary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ diaryDate: z.string(), bedtime: z.string().optional(), wakeTime: z.string().optional(), quality: z.number().int().min(1).max(5).optional(), notes: z.string().max(1000).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("sleep_diary")
      .upsert({ user_id: context.userId, diary_date: data.diaryDate, bedtime: data.bedtime ?? null, wake_time: data.wakeTime ?? null, quality: data.quality ?? null, notes: data.notes ?? null }, { onConflict: "user_id,diary_date" })
      .select().single();
    if (error) throw new Error(error.message);
    return { entry: row };
  });

export const listSleepDiary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("sleep_diary").select("*").eq("user_id", context.userId).order("diary_date", { ascending: false }).limit(30);
    return { entries: data ?? [] };
  });

// Workout timer
export const logWorkoutTimer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ exerciseName: z.string().min(1).max(100), totalSeconds: z.number().int().min(1), rounds: z.number().int().min(1).default(1) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("workout_timer_sessions")
      .insert({ user_id: context.userId, exercise_name: data.exerciseName, total_seconds: data.totalSeconds, rounds: data.rounds }).select().single();
    if (error) throw new Error(error.message);
    return { session: row };
  });

// Charity donation
export const donateCoins = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ coins: z.number().int().min(10).max(10000), charityName: z.string().min(1).max(100) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: prof } = await supabase.from("profiles").select("health_coins").eq("id", userId).single();
    if (!prof || (prof.health_coins ?? 0) < data.coins) throw new Error("Coin tidak cukup");
    const { data: row, error } = await supabase.from("charity_donations")
      .insert({ user_id: userId, coins_spent: data.coins, charity_name: data.charityName }).select().single();
    if (error) throw new Error(error.message);
    await supabase.from("profiles").update({ health_coins: (prof.health_coins ?? 0) - data.coins }).eq("id", userId);
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
      const rows = data.order.map((aid, i) => ({ user_id: userId, achievement_id: aid, position: i }));
      const { error } = await supabase.from("achievement_showcase_order").insert(rows);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// Budget meal plan AI
export const generateBudgetMealPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ budgetIdr: z.number().int().min(10000).max(10000000), days: z.number().int().min(1).max(14) }).parse(d))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY belum di-set");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Kamu ahli gizi & budget Indonesia. Jawab JSON {days:[{day, meals:[{name, est_idr, calories}]}]} dengan total mendekati budget." },
          { role: "user", content: `Budget total: Rp ${data.budgetIdr} untuk ${data.days} hari. 3 meal/hari. Gunakan bahan lokal murah.` },
        ],
      }),
    });
    if (!res.ok) throw new Error(`AI error: ${res.status}`);
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = json.choices?.[0]?.message?.content ?? "{}";
    const m = text.match(/\{[\s\S]*\}/);
    const planStr = m ? m[0] : "{}";
    await context.supabase.from("budget_meal_plans")
      .insert({ user_id: context.userId, budget_idr: data.budgetIdr, days: data.days, plan: JSON.parse(planStr) as never });
    return { planJson: planStr };
  });

// Recipe from fridge photo (AI)
export const recipeFromFridge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ imageBase64: z.string().min(10) }).parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY belum di-set");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: "Lihat foto kulkas ini. Identifikasi bahan dan saran 3 resep. JSON {ingredients:[], recipes:[{name, steps:[]}]}." },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${data.imageBase64}` } },
          ],
        }],
      }),
    });
    if (!res.ok) throw new Error(`AI error: ${res.status}`);
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = json.choices?.[0]?.message?.content ?? "{}";
    const m = text.match(/\{[\s\S]*\}/);
    let result: { ingredients?: string[]; recipes?: { name: string; steps: string[] }[] } = {};
    try { result = JSON.parse(m ? m[0] : "{}"); } catch { result = {}; }
    return { result };
  });