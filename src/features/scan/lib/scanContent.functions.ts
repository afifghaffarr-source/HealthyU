import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAiWithGuards, callAiJsonWithSchema } from "@/features/ai/lib/aiGateway.server";
import { makeScanAiCaller } from "./scanCore.server";
import { logServerError } from "@/lib/logger.server";

const callAI = makeScanAiCaller("scanBatch7");

const DailyChallengeSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  goal_type: z.string().optional(),
  goal_value: z.number().optional(),
});

// ===== from scanBatch7a (getDailyQuote, getDailyQuiz, answerDailyQuiz) =====

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
      context.userId,
      supabase,
    );
    const { data: inserted } = await supabase
      .from("daily_quotes")
      .insert({ date: today, quote: text.trim(), category: "nutrition" })
      .select()
      .single();
    return { quote: inserted };
  });

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
      userId,
      supabase,
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

// ===== from scanSocialA1 (getDailyChallenge) =====

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
    } catch (e) {
      // AI returned a response that didn't match DailyChallengeSchema.
      // We fall through with the local `fallback` so the user still gets
      // a usable challenge. Surface the parse failure for observability.
      logServerError("scanContent.dailyChallenge", e, { stage: "schema-parse" });
    }
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

// ===== from scanSocialA2 (completeDailyChallenge) =====

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

// ===== from scanBatch12b (generateWeeklyPodcast) =====

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
