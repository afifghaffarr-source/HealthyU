import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { buildCompactProfile, compactTodayBlock } from "@/features/ai/lib/aiRouter.server";
import { SYSTEM_PROMPT, detectEmergency, persistUserMessage } from "./chatPrompt.server";
import {
  buildProfileBlock,
  buildFastingBlock,
  buildSleepBlock,
  buildWorkoutBlock,
  buildWeekBlock,
  buildContextBlock,
} from "./chatContextBlocks.server";
import { fetchChatContext } from "./chatContextFetch.server";

export { SYSTEM_PROMPT, detectEmergency, persistUserMessage };

type SB = SupabaseClient<Database>;

export async function buildChatPayload(
  supabase: SB,
  userId: string,
  message: string,
  imageBase64?: string,
  imageMime?: string,
  tier: 1 | 2 | 3 = 3,
): Promise<{ messages: unknown[]; isEmergency: boolean }> {
  const {
    profile,
    history,
    meals,
    water,
    workouts,
    fasting,
    sleep,
    weekMeals,
    weekWorkouts,
    weekFasting,
    weekWeight,
    weekMood,
  } = await fetchChatContext(supabase, userId);

  const { profileBlock, tdee } = buildProfileBlock(profile ?? null);

  const totalCal = (meals ?? []).reduce((s, m) => s + Number(m.calories ?? 0), 0);
  const totalProtein = (meals ?? []).reduce((s, m) => s + Number(m.protein_g ?? 0), 0);
  const totalCarbs = (meals ?? []).reduce((s, m) => s + Number(m.carbs_g ?? 0), 0);
  const totalFat = (meals ?? []).reduce((s, m) => s + Number(m.fat_g ?? 0), 0);
  const totalWater = (water ?? []).reduce((s, w) => s + Number(w.amount_ml ?? 0), 0);
  const totalBurn = (workouts ?? []).reduce((s, w) => s + Number(w.calories_burned ?? 0), 0);
  const calTarget = profile?.daily_calorie_target ?? tdee ?? 2000;
  const remaining = Math.round(calTarget - totalCal + totalBurn);

  const f = fasting?.[0];
  const s = sleep?.[0];
  const fastingBlock = buildFastingBlock(f);
  const sleepBlock = buildSleepBlock(s);
  const workoutBlock = buildWorkoutBlock(workouts ?? null);
  const weekBlock = buildWeekBlock({
    weekMeals: weekMeals ?? null,
    weekWorkouts: weekWorkouts ?? null,
    weekFasting: weekFasting ?? null,
    weekWeight: weekWeight ?? null,
    weekMood: weekMood ?? null,
  });
  const contextBlock = buildContextBlock({
    profileBlock,
    totalCal,
    totalProtein,
    totalCarbs,
    totalFat,
    totalWater,
    totalBurn,
    calTarget,
    remaining,
    workoutBlock,
    fastingBlock,
    sleepBlock,
    weekBlock,
  });

  const isEmergency = detectEmergency(message);
  const emergencyNote = isEmergency
    ? "\n\n⚠️ PESAN USER MENGANDUNG INDIKASI DARURAT — WAJIB awali jawaban dengan blok peringatan darurat (119/118/IGD) sebelum konten lain."
    : "";

  const recent = (history ?? []).reverse();
  const lastIdx = recent.length - 1;
  const userParts: unknown = imageBase64
    ? [
        { type: "text", text: message || "Tolong analisis foto ini." },
        {
          type: "image_url",
          image_url: { url: `data:${imageMime ?? "image/jpeg"};base64,${imageBase64}` },
        },
      ]
    : message;

  let systemContent: string;
  if (tier <= 2 && !imageBase64) {
    const compact = await buildCompactProfile(supabase, userId);
    const todayLine = compactTodayBlock({
      cal: totalCal,
      calTarget,
      burn: totalBurn,
      water: totalWater,
      fastingActive: !!(f && !f.end_time),
      sleepH: s
        ? (new Date(s.sleep_end).getTime() - new Date(s.sleep_start).getTime()) / 3600000
        : null,
      workoutDone: (workouts ?? []).length > 0,
    });
    const brevity =
      "\n\nGAYA JAWAB: ringkas, maksimal 3 kalimat atau 5 bullet. Sebut angka konkret dari konteks. Hindari basa-basi.";
    systemContent =
      SYSTEM_PROMPT +
      `\n\n=== PROFIL (ringkas) ===\n${compact.block}\n\n=== HARI INI ===\n${todayLine}` +
      brevity +
      emergencyNote;
  } else {
    systemContent = SYSTEM_PROMPT + contextBlock + emergencyNote;
  }

  const messages = [
    { role: "system", content: systemContent },
    ...recent.map((m, i) =>
      i === lastIdx && imageBase64
        ? { role: m.role, content: userParts }
        : { role: m.role, content: m.content },
    ),
  ];
  return { messages, isEmergency };
}
