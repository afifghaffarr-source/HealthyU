import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAiWithGuards, callAiJsonWithSchema } from "@/features/ai/lib/aiGateway.server";

const DailyChallengeSchema = z
  .object({
    title: z.string().optional(),
    description: z.string().optional(),
    goal_type: z.string().optional(),
    goal_value: z.number().optional(),
  })
  ;

const RemixSchema = z
  .object({
    title: z.string().default(""),
    ingredients: z.array(z.string()).default([]),
    instructions: z.array(z.string()).default([]),
    calories: z.number().optional(),
    protein_g: z.number().optional(),
    carbs_g: z.number().optional(),
    fat_g: z.number().optional(),
    notes: z.string().optional(),
  })
  ;

// ============ 9: Streak Freeze ============
export const useStreakFreeze = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    const { data: prof } = await supabase
      .from("profiles")
      .select("health_coins, streak_freeze_used_at, last_scan_date, scan_streak_current")
      .eq("id", userId)
      .maybeSingle();
    if (!prof) throw new Error("Profile not found");
    if ((prof.health_coins ?? 0) < 30) throw new Error("Coin tidak cukup (butuh 30)");
    if (prof.streak_freeze_used_at === today) throw new Error("Sudah dipakai hari ini");
    await supabase
      .from("profiles")
      .update({
        health_coins: (prof.health_coins ?? 0) - 30,
        streak_freeze_used_at: today,
        last_scan_date: today,
      })
      .eq("id", userId);
    return { ok: true, streak: prof.scan_streak_current };
  });

// ============ 3: Group scan leaderboard ============
export const getGroupScanLeaderboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { groupId: string }) => z.object({ groupId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data: members } = await supabase
      .from("friend_group_members")
      .select("user_id, profiles(full_name, avatar_url, scan_streak_current)")
      .eq("group_id", data.groupId);
    const rows: Array<{
      userId: string;
      name: string;
      avatar: string | null;
      streak: number;
      scans: number;
    }> = [];
    type MemberWithProfile = {
      user_id: string;
      profiles?: { full_name?: string | null; avatar_url?: string | null; scan_streak_current?: number | null } | null;
    };
    for (const m of (members ?? []) as MemberWithProfile[]) {
      const { count } = await supabase
        .from("food_scans")
        .select("*", { count: "exact", head: true })
        .eq("user_id", m.user_id)
        .gte("created_at", since);
      const p = m.profiles;
      rows.push({
        userId: m.user_id,
        name: p?.full_name ?? "User",
        avatar: p?.avatar_url ?? null,
        streak: p?.scan_streak_current ?? 0,
        scans: count ?? 0,
      });
    }
    rows.sort((a, b) => b.scans - a.scans || b.streak - a.streak);
    return { rows };
  });

// ============ 6: Reverse calorie ============
export const reverseCalorie = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { targetCalories: number }) =>
    z.object({ targetCalories: z.number().min(50).max(3000) }).parse(d),
  )
  .handler(async ({ data }) => {
    const text = await callAiWithGuards({
      userId: null,
      feature: "social.reverse_calorie",
      skipBudget: true,
      messages: [
        {
          role: "system",
          content:
            "Kamu ahli gizi Indonesia. Berikan 5 saran makanan/menu yang totalnya mendekati target kalori. Format JSON array: [{name, calories, protein_g, carbs_g, fat_g, why}].",
        },
        { role: "user", content: `Target ${data.targetCalories} kkal. Berikan opsi praktis.` },
      ],
    });
    const m = text.match(/\[[\s\S]*\]/);
    type Suggestion = {
      name: string;
      calories: number;
      protein_g?: number;
      carbs_g?: number;
      fat_g?: number;
      why?: string;
    };
    let suggestions: Suggestion[] = [];
    try {
      const parsed = m ? JSON.parse(m[0]) : [];
      suggestions = Array.isArray(parsed) ? (parsed as Suggestion[]) : [];
    } catch {}
    return { suggestions };
  });

// ============ 8: Daily AI challenge ============
export const getDailyChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    const { data: existing } = await supabase
      .from("ai_daily_challenges")
      .select("*")
      .eq("user_id", userId)
      .eq("challenge_date", today)
      .maybeSingle();
    if (existing) return { challenge: existing };
    const fallback = {
      title: "Minum 8 gelas air",
      description: "Hidrasi penuh",
      goal_type: "water_ml",
      goal_value: 2000,
    };
    type DailyChallenge = z.infer<typeof DailyChallengeSchema>;
    let parsed: DailyChallenge = { ...fallback };
    try {
      parsed = await callAiJsonWithSchema({
        userId,
        feature: "challenge.daily.generate",
        schema: DailyChallengeSchema,
        fallback,
        messages: [
          {
            role: "system",
            content:
              "Buat 1 mini challenge nutrisi harian (bahasa Indonesia, singkat & realistis). JSON: {title, description, goal_type, goal_value}. goal_type: 'water_ml'|'protein_g'|'veggies_servings'|'scan_count'|'steps'.",
          },
          { role: "user", content: "Tantangan hari ini" },
        ],
      });
      if (!parsed?.title) parsed = fallback;
    } catch {}
    const { data: created } = await supabase
      .from("ai_daily_challenges")
      .insert({
        user_id: userId,
        challenge_date: today,
        title: parsed.title ?? fallback.title,
        description: parsed.description ?? fallback.description,
        goal_type: parsed.goal_type ?? fallback.goal_type,
        goal_value: parsed.goal_value ?? fallback.goal_value,
      })
      .select()
      .single();
    return { challenge: created };
  });

export const completeDailyChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await supabase
      .from("ai_daily_challenges")
      .update({ completed: true })
      .eq("id", data.id)
      .eq("user_id", userId);
    const { data: prof } = await supabase
      .from("profiles")
      .select("health_coins")
      .eq("id", userId)
      .maybeSingle();
    await supabase
      .from("profiles")
      .update({ health_coins: (prof?.health_coins ?? 0) + 10 })
      .eq("id", userId);
    return { ok: true, coinsAwarded: 10 };
  });

// ============ 13: Recipe remix AI ============
export const remixRecipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { recipeId: string; substitute: string }) =>
    z.object({ recipeId: z.string().uuid(), substitute: z.string().min(1).max(200) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: r } = await supabase
      .from("recipes")
      .select("title, ingredients, instructions, calories, protein_g, carbs_g, fat_g")
      .eq("id", data.recipeId)
      .maybeSingle();
    if (!r) throw new Error("Recipe not found");
    type Remix = z.infer<typeof RemixSchema>;
    let remix: Remix | null = null;
    try {
      remix = await callAiJsonWithSchema({
        userId: context.userId,
        feature: "recipe.remix",
        schema: RemixSchema,
        fallback: { title: "", ingredients: [], instructions: [] },
        messages: [
          {
            role: "system",
            content:
              "Kamu chef. Remix resep dengan substitusi bahan. JSON: {title, ingredients[], instructions[], calories, protein_g, carbs_g, fat_g, notes}.",
          },
          {
            role: "user",
            content: `Resep:\n${JSON.stringify(r)}\nUbah/substitusi: ${data.substitute}`,
          },
        ],
      });
    } catch {}
    return { remix };
  });

// ============ 15: Grocery list from meal plan ============
export const getGroceryFromPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { mealPlanId: string }) =>
    z.object({ mealPlanId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: items } = await supabase
      .from("meal_plan_items")
      .select("food_name, recipe_id, serving_qty, serving_unit, recipes(ingredients)")
      .eq("meal_plan_id", data.mealPlanId);
    const counter = new Map<string, number>();
    type PlanItem = {
      food_name: string | null;
      serving_qty: number | null;
      recipes?: { ingredients?: string[] | null } | null;
    };
    for (const it of (items ?? []) as PlanItem[]) {
      const ings: string[] = it.recipes?.ingredients ?? [];
      for (const ing of ings) {
        const key = ing.toLowerCase().trim();
        counter.set(key, (counter.get(key) ?? 0) + Number(it.serving_qty ?? 1));
      }
      if (it.food_name && !ings.length) {
        const key = it.food_name.toLowerCase();
        counter.set(key, (counter.get(key) ?? 0) + Number(it.serving_qty ?? 1));
      }
    }
    const list = Array.from(counter.entries())
      .map(([item, qty]) => ({ item, qty }))
      .sort((a, b) => a.item.localeCompare(b.item));
    return { list };
  });

// ============ 19: AI Doctor chat ============
export const doctorChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { message: string }) =>
    z.object({ message: z.string().min(1).max(2000) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: meds } = await supabase
      .from("medications")
      .select("name, dosage, frequency")
      .eq("user_id", userId);
    const { data: cond } = await supabase
      .from("user_health_conditions")
      .select("condition_name, severity")
      .eq("user_id", userId);
    const { data: allergies } = await supabase
      .from("user_allergies")
      .select("allergen, severity")
      .eq("user_id", userId);
    const ctx = `Medications: ${JSON.stringify(meds ?? [])}\nConditions: ${JSON.stringify(cond ?? [])}\nAlergi: ${JSON.stringify(allergies ?? [])}`;
    const reply = await callAiWithGuards({
      userId,
      feature: "doctor.chat",
      messages: [
        {
          role: "system",
          content:
            "Kamu AI health advisor (BUKAN dokter). Berikan info edukasi singkat & sarankan konsultasi tenaga medis. Bahasa Indonesia. Pertimbangkan konteks pengguna.",
        },
        { role: "system", content: ctx },
        { role: "user", content: data.message },
      ],
    });
    return { reply };
  });

