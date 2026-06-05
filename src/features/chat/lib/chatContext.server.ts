import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { todayRange } from "@/lib/health";
import { buildCompactProfile, compactTodayBlock } from "@/features/ai/lib/aiRouter.server";
import {
  SYSTEM_PROMPT,
  detectEmergency,
  persistUserMessage,
} from "./chatPrompt.server";
import {
  buildProfileBlock,
  buildFastingBlock,
  buildSleepBlock,
  buildWorkoutBlock,
  buildWeekBlock,
  buildContextBlock,
} from "./chatContextBlocks.server";

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
  const { start, end } = todayRange();
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);
  const [
    { data: profile },
    { data: history },
    { data: meals },
    { data: water },
    { data: workouts },
    { data: fasting },
    { data: sleep },
    { data: weekMeals },
    { data: weekWorkouts },
    { data: weekFasting },
    { data: weekWeight },
    { data: weekMood },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "full_name, gender, birth_date, weight_kg, height_cm, target_weight_kg, activity_level, daily_calorie_target, dietary_preference, allergies, health_conditions, city",
      )
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("chat_messages")
      .select("role, content")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("meal_logs")
      .select("calories, protein_g, carbs_g, fat_g, meal_type")
      .eq("user_id", userId)
      .gte("logged_at", start)
      .lt("logged_at", end),
    supabase
      .from("water_logs")
      .select("amount_ml")
      .eq("user_id", userId)
      .gte("logged_at", start)
      .lt("logged_at", end),
    supabase
      .from("workout_sessions")
      .select("name, duration_min, calories_burned")
      .eq("user_id", userId)
      .gte("performed_at", start)
      .lt("performed_at", end),
    supabase
      .from("fasting_sessions")
      .select("start_time, end_time, target_hours, protocol, completed")
      .eq("user_id", userId)
      .order("start_time", { ascending: false })
      .limit(1),
    supabase
      .from("sleep_logs")
      .select("sleep_start, sleep_end, quality")
      .eq("user_id", userId)
      .order("sleep_end", { ascending: false })
      .limit(1),
    supabase
      .from("meal_logs")
      .select("calories, logged_at")
      .eq("user_id", userId)
      .gte("logged_at", weekStart.toISOString()),
    supabase
      .from("workout_sessions")
      .select("performed_at")
      .eq("user_id", userId)
      .gte("performed_at", weekStart.toISOString()),
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
  ]);

  let profileBlock = "Profil belum diisi.";
  let tdee: number | null = null;
  if (profile?.weight_kg && profile?.height_cm && profile?.gender) {
    const age = calcAge(profile.birth_date ?? null);
    const bmi = calcBMI(profile.weight_kg, profile.height_cm);
    const cat = bmiCategory(bmi).label;
    const bmr = calcBMR({
      weightKg: profile.weight_kg,
      heightCm: profile.height_cm,
      age,
      gender: profile.gender as "male" | "female",
    });
    tdee = calcTDEE(bmr, (profile.activity_level as ActivityLevel) ?? "sedentary");
    profileBlock = [
      `- Nama: ${profile.full_name ?? "-"}`,
      `- Usia: ${age} thn, Gender: ${profile.gender}`,
      `- Tinggi/Berat: ${profile.height_cm}cm / ${profile.weight_kg}kg (target: ${profile.target_weight_kg ?? "-"}kg)`,
      `- BMI: ${bmi} (${cat}), BMR: ${bmr} kkal, TDEE: ${tdee} kkal`,
      `- Aktivitas: ${profile.activity_level ?? "-"}`,
      `- Target kalori harian: ${profile.daily_calorie_target ?? tdee} kkal`,
      `- Preferensi diet: ${profile.dietary_preference ?? "-"}`,
      `- Alergi: ${(profile.allergies ?? []).join(", ") || "-"}`,
      `- Kondisi kesehatan: ${(profile.health_conditions ?? []).join(", ") || "-"}`,
      `- Kota: ${profile.city ?? "-"}`,
    ].join("\n");
  }

  const totalCal = (meals ?? []).reduce((s, m) => s + Number(m.calories ?? 0), 0);
  const totalProtein = (meals ?? []).reduce((s, m) => s + Number(m.protein_g ?? 0), 0);
  const totalCarbs = (meals ?? []).reduce((s, m) => s + Number(m.carbs_g ?? 0), 0);
  const totalFat = (meals ?? []).reduce((s, m) => s + Number(m.fat_g ?? 0), 0);
  const totalWater = (water ?? []).reduce((s, w) => s + Number(w.amount_ml ?? 0), 0);
  const totalBurn = (workouts ?? []).reduce((s, w) => s + Number(w.calories_burned ?? 0), 0);
  const calTarget = profile?.daily_calorie_target ?? tdee ?? 2000;
  const remaining = Math.round(calTarget - totalCal + totalBurn);

  let fastingBlock = "Tidak ada sesi puasa aktif.";
  const f = fasting?.[0];
  if (f) {
    if (!f.end_time) {
      const elapsedH = (Date.now() - new Date(f.start_time).getTime()) / 3600000;
      const remH = Math.max(0, Number(f.target_hours) - elapsedH);
      fastingBlock = `Sedang puasa ${f.protocol}: ${elapsedH.toFixed(1)}h berlalu, sisa ${remH.toFixed(1)}h dari target ${f.target_hours}h.`;
    } else {
      fastingBlock = `Puasa terakhir: ${f.protocol}, ${f.completed ? "selesai ✓" : "tidak selesai"}.`;
    }
  }

  let sleepBlock = "Belum ada data tidur.";
  const s = sleep?.[0];
  if (s) {
    const hours = (new Date(s.sleep_end).getTime() - new Date(s.sleep_start).getTime()) / 3600000;
    sleepBlock = `Tidur terakhir: ${hours.toFixed(1)} jam, kualitas ${s.quality}/5.`;
  }

  const workoutBlock = (workouts ?? []).length
    ? (workouts ?? [])
        .map((w) => `${w.name} (${w.duration_min}m, ${w.calories_burned} kkal)`)
        .join("; ")
    : "Belum olahraga hari ini.";

  const days: Record<string, number> = {};
  (weekMeals ?? []).forEach((m) => {
    const k = String(m.logged_at).slice(0, 10);
    days[k] = (days[k] ?? 0) + Number(m.calories ?? 0);
  });
  const dayKeys = Object.keys(days);
  const weekAvgCal = dayKeys.length
    ? Math.round(dayKeys.reduce((s, k) => s + days[k], 0) / dayKeys.length)
    : 0;
  const weekWorkoutDays = new Set(
    (weekWorkouts ?? []).map((w) => String(w.performed_at).slice(0, 10)),
  ).size;
  const weekFastingSuccess = (weekFasting ?? []).filter((f) => f.completed).length;
  const weekFastingTotal = (weekFasting ?? []).length;
  const wFirst = weekWeight?.[0]?.weight_kg ? Number(weekWeight[0].weight_kg) : null;
  const wLast =
    weekWeight && weekWeight.length ? Number(weekWeight[weekWeight.length - 1].weight_kg) : null;
  const weightDelta = wFirst != null && wLast != null ? wLast - wFirst : null;
  const moodAvg = (weekMood ?? []).length
    ? (weekMood ?? []).reduce((s, m) => s + Number(m.mood), 0) / (weekMood ?? []).length
    : null;

  const weekBlock = [
    `- Rata-rata kalori 7 hari: ${weekAvgCal} kkal`,
    `- Hari olahraga 7 hari: ${weekWorkoutDays}/7`,
    `- Puasa berhasil: ${weekFastingSuccess}/${weekFastingTotal || 0} sesi`,
    `- Δ Berat 7 hari: ${weightDelta != null ? `${weightDelta > 0 ? "+" : ""}${weightDelta.toFixed(1)} kg` : "-"}`,
    `- Mood rata-rata: ${moodAvg != null ? `${moodAvg.toFixed(1)}/5` : "-"}`,
  ].join("\n");

  const contextBlock = `

=== PROFIL USER ===
${profileBlock}

=== DATA HARI INI (${new Date().toLocaleDateString("id-ID")}) ===
- Kalori masuk: ${fmtNum(totalCal)} kkal (target ${calTarget} kkal)
- Kalori terbakar olahraga: ${fmtNum(totalBurn)} kkal
- Sisa budget kalori: ${remaining} kkal
- Makro: Protein ${fmtNum(totalProtein, 1)}g | Karbo ${fmtNum(totalCarbs, 1)}g | Lemak ${fmtNum(totalFat, 1)}g
- Air minum: ${totalWater} ml
- Olahraga: ${workoutBlock}
- Puasa: ${fastingBlock}
- Tidur: ${sleepBlock}

=== TREN 7 HARI ===
${weekBlock}

Gunakan data di atas untuk personalisasi jawaban. Sebut angka konkret saat relevan.`;

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