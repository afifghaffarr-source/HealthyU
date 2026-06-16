import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAiWithGuards, callAiJsonWithSchema } from "@/features/ai/lib/aiGateway.server";
import { makeScanAiCaller } from "./scanCore.server";
import { logServerError } from "@/lib/logger.server";

const callAI = makeScanAiCaller("scanAICoach");

// ===== Voice transcription (multimodal AI) =====

export const transcribeVoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        audioBase64: z.string().min(10),
        mimeType: z.string().default("audio/webm"),
        source: z.string().default("mood"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const text = await callAiWithGuards({
      userId: context.userId,
      feature: "voice.transcribe",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Transkripsikan audio bahasa Indonesia berikut secara ringkas. Jawab teks transkrip saja.",
            },
            {
              type: "input_audio",
              input_audio: {
                data: data.audioBase64,
                format: data.mimeType.split("/")[1] ?? "webm",
              },
            },
          ],
        },
      ],
    });
    const transcript = text.trim();
    const { data: row, error } = await context.supabase
      .from("voice_transcripts")
      .insert({
        user_id: context.userId,
        source: data.source,
        transcript,
        metadata: { mimeType: data.mimeType } as never,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { transcript, record: row };
  });

// ===== Form check (workout form analysis) =====

const FormCheckSchema = z.object({
  score: z.number().optional(),
  mistakes: z.array(z.string()).default([]),
  tips: z.array(z.string()).default([]),
});

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

// ===== Smart meal reminder pattern (DB-only, no AI) =====

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

// ===== Recipe video script generator =====

export const generateRecipeVideoScript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { recipeName: string }) =>
    z.object({ recipeName: z.string().min(1).max(100) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const script = await callAI(
      `Buat storyboard video pendek (5 scene, masing-masing 1 kalimat) untuk masak ${data.recipeName}. Bahasa Indonesia.`,
      "Kamu food video director.",
      context.userId,
      context.supabase,
    );
    return { script };
  });

// ===== Coach interview (onboarding summary) =====

export const coachInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { answers: Record<string, string> }) =>
    z.object({ answers: z.record(z.string(), z.string().max(500)) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const summary = await callAI(
      `Berdasarkan jawaban onboarding: ${JSON.stringify(data.answers)}. Buat ringkasan profil & 3 rekomendasi awal. Bahasa Indonesia.`,
      "Kamu coach holistik.",
      context.userId,
      context.supabase,
    );
    return { summary };
  });

// ===== Reverse calorie (food alternatives) =====

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
    } catch (e) {
      // AI returned a non-JSON suggestion list. Fall through to empty
      // suggestions — caller can show "no alternatives found".
      logServerError("scanAICoach.reverseCalorie", e, { stage: "json-parse" });
    }
    return { suggestions };
  });
