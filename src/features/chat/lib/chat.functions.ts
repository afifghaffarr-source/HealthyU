// Server functions callable from client code via RPC (createServerFn).
// Server-only helpers (`persistUserMessage`, `buildChatPayload`) live in
// `./chatContext.server` and are imported dynamically inside the handler
// closures (which run server-only via the RPC bridge) — static import
// would trip the import-protection plugin.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAiWithGuards, type AiMultimodalMessage } from "@/features/ai/lib/aiGateway.server";
import { validateChatRetentionDays } from "@/features/chat/lib/chatRetention";
import {
  getChatRetention as getChatRetentionServer,
  setChatRetention as setChatRetentionServer,
} from "@/features/chat/lib/chatRetention.server";

export const getChatHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const clearChatHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("chat_messages").delete().eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        message: z.string().min(1).max(2000),
        imageBase64: z.string().max(8_000_000).optional(),
        imageMime: z.string().max(50).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Dynamic import keeps `.server` boundary intact: chat.functions is
    // importable from client routes, but the handler body runs on the
    // server only, so loading chatContext.server at call-time is safe.
    const { persistUserMessage, buildChatPayload } = await import("./chatContext.server");
    await persistUserMessage(supabase, userId, data.message, data.imageBase64);
    const { messages, isEmergency } = await buildChatPayload(
      supabase,
      userId,
      data.message,
      data.imageBase64,
      data.imageMime,
    );

    const reply =
      (await callAiWithGuards({
        userId,
        feature: data.imageBase64 ? "chat.image" : "chat.text",
        messages: messages as AiMultimodalMessage[],
      })) || "Maaf, saya tidak bisa memproses sekarang.";

    await supabase.from("chat_messages").insert({
      user_id: userId,
      role: "assistant",
      content: reply,
    });

    return { reply, emergency: isEmergency };
  });

export const weeklyHealthReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const [
      { data: profile },
      { data: meals },
      { data: workouts },
      { data: water },
      { data: fasting },
      { data: weight },
      { data: mood },
      { data: sleep },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, weight_kg, target_weight_kg, daily_calorie_target")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("meal_logs")
        .select("calories, protein_g, logged_at")
        .eq("user_id", userId)
        .gte("logged_at", weekStart.toISOString()),
      supabase
        .from("workout_sessions")
        .select("name, duration_min, calories_burned, performed_at")
        .eq("user_id", userId)
        .gte("performed_at", weekStart.toISOString()),
      supabase
        .from("water_logs")
        .select("amount_ml, logged_at")
        .eq("user_id", userId)
        .gte("logged_at", weekStart.toISOString()),
      supabase
        .from("fasting_sessions")
        .select("completed")
        .eq("user_id", userId)
        .gte("start_time", weekStart.toISOString()),
      supabase
        .from("weight_logs")
        .select("weight_kg, logged_at")
        .eq("user_id", userId)
        .gte("logged_at", weekStart.toISOString())
        .order("logged_at", { ascending: true }),
      supabase
        .from("mood_logs")
        .select("mood")
        .eq("user_id", userId)
        .gte("logged_at", weekStart.toISOString()),
      supabase
        .from("sleep_logs")
        .select("sleep_start, sleep_end")
        .eq("user_id", userId)
        .gte("sleep_end", weekStart.toISOString()),
    ]);

    const calByDay: Record<string, number> = {};
    (meals ?? []).forEach((m) => {
      const k = String(m.logged_at).slice(0, 10);
      calByDay[k] = (calByDay[k] ?? 0) + Number(m.calories ?? 0);
    });
    const days = Object.keys(calByDay);
    const avgCal = days.length
      ? Math.round(days.reduce((s, k) => s + calByDay[k], 0) / days.length)
      : 0;
    const avgProtein = (meals ?? []).length
      ? Math.round(
          (meals ?? []).reduce((s, m) => s + Number(m.protein_g ?? 0), 0) /
            Math.max(days.length, 1),
        )
      : 0;
    const workoutDays = new Set((workouts ?? []).map((w) => String(w.performed_at).slice(0, 10)))
      .size;
    const totalBurn = (workouts ?? []).reduce((s, w) => s + Number(w.calories_burned ?? 0), 0);
    const waterByDay: Record<string, number> = {};
    (water ?? []).forEach((w) => {
      const k = String(w.logged_at).slice(0, 10);
      waterByDay[k] = (waterByDay[k] ?? 0) + Number(w.amount_ml ?? 0);
    });
    const avgWater = Object.keys(waterByDay).length
      ? Math.round(
          Object.values(waterByDay).reduce((a, b) => a + b, 0) / Object.keys(waterByDay).length,
        )
      : 0;
    const fastingSuccess = (fasting ?? []).filter((f) => f.completed).length;
    const fastingTotal = (fasting ?? []).length;
    const wFirst = weight?.[0]?.weight_kg ? Number(weight[0].weight_kg) : null;
    const wLast = weight && weight.length ? Number(weight[weight.length - 1].weight_kg) : null;
    const weightDelta = wFirst != null && wLast != null ? wLast - wFirst : null;
    const moodAvg = (mood ?? []).length
      ? (mood ?? []).reduce((s, m) => s + Number(m.mood), 0) / (mood ?? []).length
      : null;
    const sleepHours = (sleep ?? []).map(
      (s) => (new Date(s.sleep_end).getTime() - new Date(s.sleep_start).getTime()) / 3600000,
    );
    const avgSleep = sleepHours.length
      ? sleepHours.reduce((a, b) => a + b, 0) / sleepHours.length
      : null;

    const data = {
      nama: profile?.full_name ?? "Sahabat",
      target_kalori: profile?.daily_calorie_target ?? null,
      target_bb: profile?.target_weight_kg ?? null,
      bb_sekarang: profile?.weight_kg ?? null,
      avg_kalori: avgCal,
      avg_protein_g: avgProtein,
      hari_olahraga: workoutDays,
      kalori_terbakar_total: totalBurn,
      avg_air_ml: avgWater,
      puasa: `${fastingSuccess}/${fastingTotal}`,
      delta_bb_kg: weightDelta,
      mood_avg: moodAvg,
      avg_tidur_jam: avgSleep,
    };

    const prompt = `Buat Laporan Kesehatan Mingguan dalam Bahasa Indonesia untuk user berikut. Gunakan format markdown dengan heading, bullet, dan emoji. Berikan: (1) Ringkasan metrik dengan check ✅ / warning ⚠️, (2) Analisis singkat, (3) 3 rekomendasi actionable, (4) Prediksi progress jika pola berlanjut. Hindari diagnosis medis. Data:\n\n${JSON.stringify(data, null, 2)}`;

    const report =
      (await callAiWithGuards({
        userId,
        feature: "chat.weekly_report",
        messages: [
          { role: "system", content: (await import("./chatContext.server")).SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
      })) || "Belum bisa membuat laporan.";

    await supabase.from("chat_messages").insert({
      user_id: userId,
      role: "assistant",
      content: `📊 **Laporan Kesehatan Mingguan**\n\n${report}`,
    });

    return { report, data };
  });

// AUDIT-017 Phase 3: chat retention toggles.
// "null" is encoded as 0 in the wire format so the input validator
// can require a real number for the retention setting; the actual
// `null` semantics ("keep forever") is represented by sentinel
// value 0, then converted back inside the handler.
const retentionInputSchema = z.object({
  days: z.number().int().min(0).max(3650),
});

function inputToRetentionDays(days: number): number | null {
  // Sentinel 0 = null (keep forever)
  if (days === 0) return null;
  return days;
}

function retentionDaysToInput(days: number | null): number {
  if (days === null) return 0;
  return days;
}

export const getChatRetention = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const days = await getChatRetentionServer(supabase, userId);
    return { days: retentionDaysToInput(days) };
  });

export const setChatRetention = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => retentionInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const validated = validateChatRetentionDays(inputToRetentionDays(data.days));
    const saved = await setChatRetentionServer(supabase, userId, validated);
    return { days: retentionDaysToInput(saved) };
  });
