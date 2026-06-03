import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
    const rows: Array<{ userId: string; name: string; avatar: string | null; streak: number; scans: number }> = [];
    for (const m of members ?? []) {
      const { count } = await supabase
        .from("food_scans")
        .select("*", { count: "exact", head: true })
        .eq("user_id", m.user_id)
        .gte("created_at", since);
      const p = (m as any).profiles;
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
    z.object({ targetCalories: z.number().min(50).max(3000) }).parse(d)
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "Kamu ahli gizi Indonesia. Berikan 5 saran makanan/menu yang totalnya mendekati target kalori. Format JSON array: [{name, calories, protein_g, carbs_g, fat_g, why}].",
          },
          { role: "user", content: `Target ${data.targetCalories} kkal. Berikan opsi praktis.` },
        ],
      }),
    });
    if (!res.ok) throw new Error(`AI ${res.status}`);
    const json = await res.json();
    const text = json.choices?.[0]?.message?.content ?? "[]";
    const m = text.match(/\[[\s\S]*\]/);
    let suggestions: any[] = [];
    try { suggestions = m ? JSON.parse(m[0]) : []; } catch {}
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
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "Buat 1 mini challenge nutrisi harian (bahasa Indonesia, singkat & realistis). JSON: {title, description, goal_type, goal_value}. goal_type: 'water_ml'|'protein_g'|'veggies_servings'|'scan_count'|'steps'.",
          },
          { role: "user", content: "Tantangan hari ini" },
        ],
      }),
    });
    const json = await res.json();
    const text = json.choices?.[0]?.message?.content ?? "{}";
    const m = text.match(/\{[\s\S]*\}/);
    let parsed: any = { title: "Minum 8 gelas air", description: "Hidrasi penuh", goal_type: "water_ml", goal_value: 2000 };
    try { if (m) parsed = JSON.parse(m[0]); } catch {}
    const { data: created } = await supabase
      .from("ai_daily_challenges")
      .insert({
        user_id: userId,
        challenge_date: today,
        title: parsed.title,
        description: parsed.description,
        goal_type: parsed.goal_type,
        goal_value: parsed.goal_value,
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
    await supabase.from("ai_daily_challenges").update({ completed: true }).eq("id", data.id).eq("user_id", userId);
    const { data: prof } = await supabase.from("profiles").select("health_coins").eq("id", userId).maybeSingle();
    await supabase.from("profiles").update({ health_coins: (prof?.health_coins ?? 0) + 10 }).eq("id", userId);
    return { ok: true, coinsAwarded: 10 };
  });

// ============ 13: Recipe remix AI ============
export const remixRecipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { recipeId: string; substitute: string }) =>
    z.object({ recipeId: z.string().uuid(), substitute: z.string().min(1).max(200) }).parse(d)
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: r } = await supabase
      .from("recipes")
      .select("title, ingredients, instructions, calories, protein_g, carbs_g, fat_g")
      .eq("id", data.recipeId)
      .maybeSingle();
    if (!r) throw new Error("Recipe not found");
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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
      }),
    });
    const json = await res.json();
    const text = json.choices?.[0]?.message?.content ?? "{}";
    const m = text.match(/\{[\s\S]*\}/);
    let remix: any = null;
    try { if (m) remix = JSON.parse(m[0]); } catch {}
    return { remix };
  });

// ============ 15: Grocery list from meal plan ============
export const getGroceryFromPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { mealPlanId: string }) =>
    z.object({ mealPlanId: z.string().uuid() }).parse(d)
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: items } = await supabase
      .from("meal_plan_items")
      .select("food_name, recipe_id, serving_qty, serving_unit, recipes(ingredients)")
      .eq("meal_plan_id", data.mealPlanId);
    const counter = new Map<string, number>();
    for (const it of items ?? []) {
      const ings: string[] = (it as any).recipes?.ingredients ?? [];
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
    z.object({ message: z.string().min(1).max(2000) }).parse(d)
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
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");
    const ctx = `Medications: ${JSON.stringify(meds ?? [])}\nConditions: ${JSON.stringify(cond ?? [])}\nAlergi: ${JSON.stringify(allergies ?? [])}`;
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "Kamu AI health advisor (BUKAN dokter). Berikan info edukasi singkat & sarankan konsultasi tenaga medis. Bahasa Indonesia. Pertimbangkan konteks pengguna.",
          },
          { role: "system", content: ctx },
          { role: "user", content: data.message },
        ],
      }),
    });
    const json = await res.json();
    return { reply: json.choices?.[0]?.message?.content ?? "" };
  });

// ============ 20: Follow / public profile ============
export const followUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { targetId: string }) => z.object({ targetId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    if (data.targetId === userId) throw new Error("Tidak bisa follow diri sendiri");
    const { error } = await supabase
      .from("user_follows")
      .insert({ follower_id: userId, following_id: data.targetId });
    if (error && !error.message.includes("duplicate")) throw error;
    return { ok: true };
  });

export const unfollowUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { targetId: string }) => z.object({ targetId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await supabase
      .from("user_follows")
      .delete()
      .eq("follower_id", userId)
      .eq("following_id", data.targetId);
    return { ok: true };
  });

// ============ 12: Meal stories (24h) ============
export const createMealStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { caption?: string; imageUrl?: string; mealLogId?: string }) =>
    z.object({
      caption: z.string().max(280).optional(),
      imageUrl: z.string().url().optional(),
      mealLogId: z.string().uuid().optional(),
    }).parse(d)
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: story, error } = await supabase
      .from("meal_stories")
      .insert({
        user_id: userId,
        caption: data.caption,
        image_url: data.imageUrl,
        meal_log_id: data.mealLogId,
      })
      .select()
      .single();
    if (error) throw error;
    return { story };
  });

export const listStoriesFeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data } = await supabase
      .from("meal_stories")
      .select("id, user_id, caption, image_url, created_at, expires_at, profiles!inner(full_name, avatar_url)")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(50);
    return { stories: data ?? [] };
  });

// ============ 17 + 18: workout match & sleep correlation ============
export const getWorkoutMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    const { data: meals } = await supabase
      .from("meal_logs")
      .select("calories")
      .eq("user_id", userId)
      .gte("log_date", today);
    const totalKcal = (meals ?? []).reduce((s, m) => s + Number(m.calories ?? 0), 0);
    // ~7 kcal/min jogging, 5 kcal/min walking, 10 kcal/min HIIT (avg 70kg)
    return {
      totalKcal,
      suggestions: [
        { type: "Jalan kaki", minutes: Math.round(totalKcal / 5) },
        { type: "Jogging", minutes: Math.round(totalKcal / 7) },
        { type: "HIIT", minutes: Math.round(totalKcal / 10) },
      ],
    };
  });

export const getSleepMealCorrelation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const since = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
    const { data: sleeps } = await supabase
      .from("sleep_logs")
      .select("sleep_date, duration_hours")
      .eq("user_id", userId)
      .gte("sleep_date", since);
    const { data: meals } = await supabase
      .from("meal_logs")
      .select("log_date, calories")
      .eq("user_id", userId)
      .gte("log_date", since);
    const mealByDate = new Map<string, number>();
    for (const m of meals ?? []) {
      mealByDate.set(m.log_date, (mealByDate.get(m.log_date) ?? 0) + Number(m.calories ?? 0));
    }
    const points = (sleeps ?? []).map((s) => ({
      date: s.sleep_date,
      sleepHours: Number(s.duration_hours ?? 0),
      calories: mealByDate.get(s.sleep_date) ?? 0,
    }));
    return { points };
  });