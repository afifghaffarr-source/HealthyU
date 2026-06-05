import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { makeScanAiCaller } from "./scanCallAi.server";

const callAI = makeScanAiCaller("scanBatch7");

export const getDailyQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const today = new Date().toISOString().slice(0, 10);
    const { data: existing } = await supabase
      .from("daily_quotes")
      .select("*")
      .eq("date", today)
      .maybeSingle();
    if (existing) return { quote: existing };
    const text = await callAI(
      "Buat 1 quote pendek (max 20 kata) tentang nutrisi/kesehatan dalam Bahasa Indonesia. Hanya teks quote, tanpa tanda kutip.",
      "Kamu coach nutrisi.",
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
      "Kamu pembuat kuis nutrisi.",
    );
    type QuizParsed = { question: string; options: string[]; correct_index: number };
    let parsed: QuizParsed;
    try {
      parsed = JSON.parse(raw.replace(/```json|```/g, "").trim()) as QuizParsed;
    } catch {
      parsed = {
        question: "Berapa kalori dalam 1 gram protein?",
        options: ["2", "4", "7", "9"],
        correct_index: 1,
      };
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
    z.object({ quizId: z.string().uuid(), answer: z.number().int().min(0).max(3) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: q } = await supabase
      .from("nutrition_quizzes")
      .select("*")
      .eq("id", data.quizId)
      .maybeSingle();
    if (!q || q.user_id !== userId) throw new Error("Quiz not found");
    if (q.user_answer !== null) throw new Error("Sudah dijawab");
    const correct = data.answer === q.correct_index;
    const coins = correct ? 5 : 0;
    await supabase
      .from("nutrition_quizzes")
      .update({ user_answer: data.answer, is_correct: correct, coins_awarded: coins })
      .eq("id", data.quizId);
    if (coins > 0) {
      const { data: p } = await supabase
        .from("profiles")
        .select("health_coins")
        .eq("id", userId)
        .maybeSingle();
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
    for (const r of data ?? []) {
      const d = r.log_date;
      if (!d) continue;
      counts[d] = (counts[d] ?? 0) + 1;
    }
    return { counts };
  });

// 9. AI body composition estimator
export const estimateBodyComposition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { photoUrl: string }) => z.object({ photoUrl: z.string().url() }).parse(d))
  .handler(async ({ data }) => {
    const text = await callAI(
      `Analisis foto progress ini: ${data.photoUrl}. Estimasi: body fat %, muscle mass tier (low/med/high), posture. JSON only.`,
      "Kamu fitness analyst.",
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
    const total = (data ?? []).reduce<number>((s, w) => s + (w.calories_burned ?? 0), 0);
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
    for (const m of data ?? []) {
      if (!m.logged_at || !m.meal_type) continue;
      const h = new Date(m.logged_at).getHours();
      if (!buckets[m.meal_type]) buckets[m.meal_type] = [];
      buckets[m.meal_type].push(h);
    }
    const recommended: Record<string, number> = {};
    Object.entries(buckets).forEach(([k, arr]) => {
      recommended[k] = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
    });
    return { recommended };
  });
