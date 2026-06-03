import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const LOVABLE_AI = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function callAI(prompt: string, system: string) {
  const res = await fetch(LOVABLE_AI, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`AI error ${res.status}`);
  const j = await res.json();
  return j.choices?.[0]?.message?.content ?? "";
}

// 5. Daily AI quote
export const getDailyQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const today = new Date().toISOString().slice(0, 10);
    const { data: existing } = await supabase.from("daily_quotes").select("*").eq("date", today).maybeSingle();
    if (existing) return { quote: existing };
    const text = await callAI(
      "Buat 1 quote pendek (max 20 kata) tentang nutrisi/kesehatan dalam Bahasa Indonesia. Hanya teks quote, tanpa tanda kutip.",
      "Kamu coach nutrisi."
    );
    const { data: inserted } = await supabase
      .from("daily_quotes")
      .insert({ date: today, quote: text.trim(), category: "nutrition" })
      .select()
      .single();
    return { quote: inserted };
  });

// 6. Mini nutrition quiz
export const getDailyQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    const { data: existing } = await supabase
      .from("nutrition_quizzes")
      .select("*")
      .eq("user_id", userId)
      .eq("date", today)
      .maybeSingle();
    if (existing) return { quiz: existing };
    const raw = await callAI(
      "Buat 1 soal pilihan ganda nutrisi (4 opsi). Format JSON: {question, options:[..4], correct_index}. Bahasa Indonesia. Hanya JSON.",
      "Kamu pembuat kuis nutrisi."
    );
    let parsed: any;
    try {
      parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    } catch {
      parsed = { question: "Berapa kalori dalam 1 gram protein?", options: ["2", "4", "7", "9"], correct_index: 1 };
    }
    const { data: inserted } = await supabase
      .from("nutrition_quizzes")
      .insert({
        user_id: userId,
        date: today,
        question: parsed.question,
        options: parsed.options,
        correct_index: parsed.correct_index,
      })
      .select()
      .single();
    return { quiz: inserted };
  });

export const answerDailyQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { quizId: string; answer: number }) =>
    z.object({ quizId: z.string().uuid(), answer: z.number().int().min(0).max(3) }).parse(d)
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: q } = await supabase.from("nutrition_quizzes").select("*").eq("id", data.quizId).maybeSingle();
    if (!q || q.user_id !== userId) throw new Error("Quiz not found");
    if (q.user_answer !== null) throw new Error("Sudah dijawab");
    const correct = data.answer === q.correct_index;
    const coins = correct ? 5 : 0;
    await supabase
      .from("nutrition_quizzes")
      .update({ user_answer: data.answer, is_correct: correct, coins_awarded: coins })
      .eq("id", data.quizId);
    if (coins > 0) {
      const { data: p } = await supabase.from("profiles").select("health_coins").eq("id", userId).maybeSingle();
      await supabase
        .from("profiles")
        .update({ health_coins: (p?.health_coins ?? 0) + coins })
        .eq("id", userId);
    }
    return { correct, coins };
  });

// 3. Discover popular users
export const discoverUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, scan_streak_current, health_coins")
      .eq("public_profile", true)
      .order("health_coins", { ascending: false })
      .limit(30);
    return { users: data ?? [] };
  });

// 4. Search user by name
export const searchUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { q: string }) => z.object({ q: z.string().min(1).max(50) }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: rows } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, scan_streak_current")
      .ilike("full_name", `%${data.q}%`)
      .eq("public_profile", true)
      .limit(20);
    return { users: rows ?? [] };
  });

// 8. Yearly meal heatmap
export const getMealHeatmap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const sinceDate = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
    const { data } = await supabase
      .from("meal_logs")
      .select("log_date")
      .eq("user_id", userId)
      .gte("log_date", sinceDate);
    const counts: Record<string, number> = {};
    (data ?? []).forEach((r: any) => {
      const d = r.log_date;
      counts[d] = (counts[d] ?? 0) + 1;
    });
    return { counts };
  });

// 9. AI body composition estimator
export const estimateBodyComposition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { photoUrl: string }) => z.object({ photoUrl: z.string().url() }).parse(d))
  .handler(async ({ data }) => {
    const text = await callAI(
      `Analisis foto progress ini: ${data.photoUrl}. Estimasi: body fat %, muscle mass tier (low/med/high), posture. JSON only.`,
      "Kamu fitness analyst."
    );
    return { analysis: text };
  });

// 10. Calorie burn auto-sync (sum recent workouts)
export const syncWorkoutBurn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("workout_sessions")
      .select("calories_burned, started_at")
      .eq("user_id", userId)
      .gte("started_at", today);
    const total = (data ?? []).reduce((s: number, w: any) => s + (w.calories_burned ?? 0), 0);
    return { totalBurned: total, sessions: data?.length ?? 0 };
  });

// 11. Smart meal reminder (analyse last 7d meal times)
export const smartMealReminderPattern = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data } = await supabase
      .from("meal_logs")
      .select("meal_type, logged_at")
      .eq("user_id", userId)
      .gte("logged_at", since);
    const buckets: Record<string, number[]> = {};
    (data ?? []).forEach((m: any) => {
      const h = new Date(m.logged_at).getHours();
      if (!buckets[m.meal_type]) buckets[m.meal_type] = [];
      buckets[m.meal_type].push(h);
    });
    const recommended: Record<string, number> = {};
    Object.entries(buckets).forEach(([k, arr]) => {
      recommended[k] = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
    });
    return { recommended };
  });

// 13. Gacha pull
const GACHA_REWARDS = [
  { label: "Coin Kecil (+5)", coins: 5, weight: 40 },
  { label: "Coin Sedang (+15)", coins: 15, weight: 25 },
  { label: "Coin Besar (+50)", coins: 50, weight: 10 },
  { label: "JACKPOT (+200)", coins: 200, weight: 2 },
  { label: "Apes (0)", coins: 0, weight: 23 },
];

export const gachaPull = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const COST = 20;
    const { data: p } = await supabase.from("profiles").select("health_coins").eq("id", userId).maybeSingle();
    if ((p?.health_coins ?? 0) < COST) throw new Error("Coin tidak cukup");
    const total = GACHA_REWARDS.reduce((s, r) => s + r.weight, 0);
    let roll = Math.random() * total;
    let chosen = GACHA_REWARDS[0];
    for (const r of GACHA_REWARDS) {
      roll -= r.weight;
      if (roll <= 0) {
        chosen = r;
        break;
      }
    }
    const newCoins = (p?.health_coins ?? 0) - COST + chosen.coins;
    await supabase.from("profiles").update({ health_coins: newCoins }).eq("id", userId);
    await supabase.from("gacha_pulls").insert({
      user_id: userId,
      cost_coins: COST,
      reward_label: chosen.label,
      reward_coins: chosen.coins,
    });
    return { reward: chosen, newCoins };
  });

// 14. Pet accessory shop
export const listPetAccessories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: shop } = await supabase.from("pet_accessories").select("*").order("cost_coins");
    const { data: owned } = await supabase.from("user_pet_accessories").select("*").eq("user_id", userId);
    return { shop: shop ?? [], owned: owned ?? [] };
  });

export const buyPetAccessory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { accessoryId: string }) => z.object({ accessoryId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: acc } = await supabase.from("pet_accessories").select("*").eq("id", data.accessoryId).maybeSingle();
    if (!acc) throw new Error("Aksesori tidak ditemukan");
    const { data: existing } = await supabase
      .from("user_pet_accessories")
      .select("id")
      .eq("user_id", userId)
      .eq("accessory_id", data.accessoryId)
      .maybeSingle();
    if (existing) throw new Error("Sudah dimiliki");
    const { data: p } = await supabase.from("profiles").select("health_coins").eq("id", userId).maybeSingle();
    if ((p?.health_coins ?? 0) < acc.cost_coins) throw new Error("Coin tidak cukup");
    await supabase
      .from("profiles")
      .update({ health_coins: (p?.health_coins ?? 0) - acc.cost_coins })
      .eq("id", userId);
    await supabase.from("user_pet_accessories").insert({
      user_id: userId,
      accessory_id: data.accessoryId,
      equipped: false,
    });
    return { ok: true };
  });

export const equipPetAccessory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; equipped: boolean }) =>
    z.object({ id: z.string().uuid(), equipped: z.boolean() }).parse(d)
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await supabase
      .from("user_pet_accessories")
      .update({ equipped: data.equipped })
      .eq("id", data.id)
      .eq("user_id", userId);
    return { ok: true };
  });

// 15. Habit stacks
export const listHabitStacks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase.from("habit_stacks").select("*").eq("user_id", userId).order("created_at");
    return { stacks: data ?? [] };
  });

export const createHabitStack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name: string; steps: string[] }) =>
    z.object({ name: z.string().min(1).max(60), steps: z.array(z.string().min(1).max(80)).min(1).max(10) }).parse(d)
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await supabase.from("habit_stacks").insert({ user_id: userId, name: data.name, steps: data.steps });
    return { ok: true };
  });

// 17. Family meal coordinator (vote)
export const voteFamilyMeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { planId: string; mealName: string }) =>
    z.object({ planId: z.string().uuid(), mealName: z.string().min(1).max(80) }).parse(d)
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    await supabase.from("family_meal_votes").insert({
      plan_id: data.planId,
      user_id: userId,
      meal_name: data.mealName,
      vote_date: today,
    });
    return { ok: true };
  });

export const getFamilyMealVotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { planId: string }) => z.object({ planId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const today = new Date().toISOString().slice(0, 10);
    const { data: rows } = await supabase
      .from("family_meal_votes")
      .select("meal_name")
      .eq("plan_id", data.planId)
      .eq("vote_date", today);
    const counts: Record<string, number> = {};
    (rows ?? []).forEach((r: any) => {
      counts[r.meal_name] = (counts[r.meal_name] ?? 0) + 1;
    });
    return { counts };
  });

// 18. Recipe video preview (AI text description -> use as placeholder)
export const generateRecipeVideoScript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { recipeName: string }) => z.object({ recipeName: z.string().min(1).max(100) }).parse(d))
  .handler(async ({ data }) => {
    const script = await callAI(
      `Buat storyboard video pendek (5 scene, masing-masing 1 kalimat) untuk masak ${data.recipeName}. Bahasa Indonesia.`,
      "Kamu food video director."
    );
    return { script };
  });

// 19. AI-driven onboarding coach interview
export const coachInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { answers: Record<string, string> }) =>
    z.object({ answers: z.record(z.string(), z.string().max(500)) }).parse(d)
  )
  .handler(async ({ data }) => {
    const summary = await callAI(
      `Berdasarkan jawaban onboarding: ${JSON.stringify(data.answers)}. Buat ringkasan profil & 3 rekomendasi awal. Bahasa Indonesia.`,
      "Kamu coach holistik."
    );
    return { summary };
  });

// 20. Followers list
export const listFollowers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: followerRows } = await supabase
      .from("user_follows")
      .select("follower_id")
      .eq("following_id", data.userId);
    const { data: followingRows } = await supabase
      .from("user_follows")
      .select("following_id")
      .eq("follower_id", data.userId);
    const followerIds = (followerRows ?? []).map((r: any) => r.follower_id);
    const followingIds = (followingRows ?? []).map((r: any) => r.following_id);
    const allIds = Array.from(new Set([...followerIds, ...followingIds]));
    const { data: profs } = allIds.length
      ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", allIds)
      : { data: [] as any[] };
    const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
    return {
      followers: followerIds.map((id) => map.get(id)).filter(Boolean),
      following: followingIds.map((id) => map.get(id)).filter(Boolean),
    };
  });