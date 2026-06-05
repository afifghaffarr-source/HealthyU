import {
  calcAge,
  calcBMI,
  calcBMR,
  calcTDEE,
  bmiCategory,
  type ActivityLevel,
} from "@/lib/health";
import { fmtNum } from "./chatPrompt.server";

type Profile = {
  full_name: string | null;
  gender: string | null;
  birth_date: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  target_weight_kg: number | null;
  activity_level: string | null;
  daily_calorie_target: number | null;
  dietary_preference: string | null;
  allergies: string[] | null;
  health_conditions: string[] | null;
  city: string | null;
} | null;

export function buildProfileBlock(profile: Profile): { profileBlock: string; tdee: number | null } {
  if (!(profile?.weight_kg && profile?.height_cm && profile?.gender)) {
    return { profileBlock: "Profil belum diisi.", tdee: null };
  }
  const age = calcAge(profile.birth_date ?? null);
  const bmi = calcBMI(profile.weight_kg, profile.height_cm);
  const cat = bmiCategory(bmi).label;
  const bmr = calcBMR({
    weightKg: profile.weight_kg,
    heightCm: profile.height_cm,
    age,
    gender: profile.gender as "male" | "female",
  });
  const tdee = calcTDEE(bmr, (profile.activity_level as ActivityLevel) ?? "sedentary");
  const profileBlock = [
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
  return { profileBlock, tdee };
}

type Fasting = { start_time: string; end_time: string | null; target_hours: number; protocol: string; completed: boolean } | undefined;
type Sleep = { sleep_start: string; sleep_end: string; quality: number } | undefined;
type Workout = { name: string; duration_min: number; calories_burned: number };

export function buildFastingBlock(f: Fasting): string {
  if (!f) return "Tidak ada sesi puasa aktif.";
  if (!f.end_time) {
    const elapsedH = (Date.now() - new Date(f.start_time).getTime()) / 3600000;
    const remH = Math.max(0, Number(f.target_hours) - elapsedH);
    return `Sedang puasa ${f.protocol}: ${elapsedH.toFixed(1)}h berlalu, sisa ${remH.toFixed(1)}h dari target ${f.target_hours}h.`;
  }
  return `Puasa terakhir: ${f.protocol}, ${f.completed ? "selesai ✓" : "tidak selesai"}.`;
}

export function buildSleepBlock(s: Sleep): string {
  if (!s) return "Belum ada data tidur.";
  const hours = (new Date(s.sleep_end).getTime() - new Date(s.sleep_start).getTime()) / 3600000;
  return `Tidur terakhir: ${hours.toFixed(1)} jam, kualitas ${s.quality}/5.`;
}

export function buildWorkoutBlock(workouts: Workout[] | null): string {
  return workouts && workouts.length
    ? workouts.map((w) => `${w.name} (${w.duration_min}m, ${w.calories_burned} kkal)`).join("; ")
    : "Belum olahraga hari ini.";
}

export function buildWeekBlock(args: {
  weekMeals: { calories: number | null; logged_at: string }[] | null;
  weekWorkouts: { performed_at: string }[] | null;
  weekFasting: { completed: boolean }[] | null;
  weekWeight: { weight_kg: number; logged_at: string }[] | null;
  weekMood: { mood: number }[] | null;
}): string {
  const { weekMeals, weekWorkouts, weekFasting, weekWeight, weekMood } = args;
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

  return [
    `- Rata-rata kalori 7 hari: ${weekAvgCal} kkal`,
    `- Hari olahraga 7 hari: ${weekWorkoutDays}/7`,
    `- Puasa berhasil: ${weekFastingSuccess}/${weekFastingTotal || 0} sesi`,
    `- Δ Berat 7 hari: ${weightDelta != null ? `${weightDelta > 0 ? "+" : ""}${weightDelta.toFixed(1)} kg` : "-"}`,
    `- Mood rata-rata: ${moodAvg != null ? `${moodAvg.toFixed(1)}/5` : "-"}`,
  ].join("\n");
}

export function buildContextBlock(args: {
  profileBlock: string;
  totalCal: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalWater: number;
  totalBurn: number;
  calTarget: number;
  remaining: number;
  workoutBlock: string;
  fastingBlock: string;
  sleepBlock: string;
  weekBlock: string;
}): string {
  const {
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
  } = args;
  return `

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
}