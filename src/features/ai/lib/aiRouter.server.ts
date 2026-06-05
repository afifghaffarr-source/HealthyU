import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type Tier = 1 | 2 | 3;
export type RouteDecision = {
  tier: Tier;
  model: string;
  reason: string;
  localAnswer?: string;
  maxTokens?: number;
};

const EMERGENCY = [
  /nyeri dada|chest pain/i,
  /sesak napas|sulit bernapas/i,
  /muntah darah|batuk darah|bab darah/i,
  /pingsan|kejang|tidak sadar/i,
  /overdosis|keracunan parah|anafilak|alergi parah/i,
  /bunuh diri|self.?harm|menyakiti diri/i,
  /stroke|lumpuh mendadak|wajah mencong/i,
];

const COMPLEX_HINTS = [
  /rencana|plan|jadwal|menu .*minggu|7 hari|14 hari/i,
  /diabetes|hipertensi|kolesterol|jantung|ginjal|asam urat/i,
  /analisis|korelasi|evaluasi|review/i,
];

// Very simple local handlers — keyword + regex. Return text or null.
function tryLocalAnswer(text: string): string | null {
  const t = text.trim().toLowerCase();
  if (/^(hai|halo|hi|hello|hey)[!. ]*$/.test(t)) {
    return "Halo! 👋 Saya HealthyU AI Coach. Ada yang bisa saya bantu soal nutrisi, olahraga, tidur, atau target sehatmu hari ini?";
  }
  if (/^(makasih|terima kasih|thanks|thank you)[!. ]*$/.test(t)) {
    return "Sama-sama! 💪 Tetap konsisten ya.";
  }
  if (/(berapa )?(target )?air( minum)?( per hari| harian)?\??$/.test(t)) {
    return "Rekomendasi umum: **8 gelas (≈2.000–2.500 ml)** air/hari, lebih banyak bila banyak aktivitas atau cuaca panas. Cek halaman Air untuk progress harianmu.";
  }
  if (/(rumus|hitung) (bmi|imt)/.test(t)) {
    return "**BMI = berat (kg) ÷ tinggi (m)²**. Contoh: 70 / (1.7×1.7) = 24.2 (normal). Buka halaman Tubuh untuk lihat BMI-mu otomatis.";
  }
  if (/(rumus|hitung) (bmr|tdee|kalori basal)/.test(t)) {
    return "**BMR (Mifflin-St Jeor):** Pria = 10·BB + 6.25·TB − 5·umur + 5; Wanita = 10·BB + 6.25·TB − 5·umur − 161. **TDEE = BMR × faktor aktivitas** (1.2 sedentary … 1.9 sangat aktif).";
  }
  return null;
}

export function classifyMessage(text: string, hasImage: boolean): RouteDecision {
  if (hasImage) {
    return { tier: 3, model: "google/gemini-2.5-pro", reason: "image", maxTokens: 800 };
  }
  if (EMERGENCY.some((re) => re.test(text))) {
    return { tier: 3, model: "google/gemini-2.5-pro", reason: "emergency", maxTokens: 600 };
  }
  const local = tryLocalAnswer(text);
  if (local) {
    return { tier: 1, model: "local", reason: "local-rule", localAnswer: local };
  }
  const wordCount = text.trim().split(/\s+/).length;
  const complexHits = COMPLEX_HINTS.filter((re) => re.test(text)).length;
  if (wordCount >= 30 && complexHits >= 2) {
    return { tier: 3, model: "google/gemini-2.5-pro", reason: "complex", maxTokens: 900 };
  }
  // Default: cheap & fast
  return {
    tier: 2,
    model: "google/gemini-2.5-flash",
    reason: "default",
    maxTokens: 400,
  };
}

// Lightweight profile fingerprint for cache key & compressed prompt.
export type CompactProfile = {
  hash: string;
  block: string;
};

export async function buildCompactProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<CompactProfile> {
  const { data: p } = await supabase
    .from("profiles")
    .select(
      "full_name, gender, birth_date, weight_kg, height_cm, target_weight_kg, activity_level, daily_calorie_target, dietary_preference, allergies, health_conditions",
    )
    .eq("id", userId)
    .maybeSingle();
  if (!p) return { hash: "anon", block: "profil:-" };

  const age = p.birth_date
    ? Math.floor((Date.now() - new Date(p.birth_date).getTime()) / (365.25 * 86400000))
    : null;
  const g = (p.gender ?? "?").toString()[0]?.toUpperCase() ?? "?";
  const bmi =
    p.weight_kg && p.height_cm ? (p.weight_kg / (p.height_cm / 100) ** 2).toFixed(1) : "-";
  const act = (p.activity_level ?? "mod").toString().slice(0, 3);
  const diet = (p.dietary_preference ?? "-").toString().slice(0, 8);
  const cond = (p.health_conditions ?? []).join(",").slice(0, 60) || "-";
  const allerg = (p.allergies ?? []).join(",").slice(0, 40) || "-";
  const cal = p.daily_calorie_target ?? "-";

  const block = `${p.full_name ?? "User"}|${g}${age ?? "?"}|${p.weight_kg ?? "?"}kg|${p.height_cm ?? "?"}cm|BMI${bmi}${p.target_weight_kg ? `→${p.target_weight_kg}` : ""}|${act}|diet:${diet}|kondisi:${cond}|alergi:${allerg}|kal:${cal}`;

  // Stable short hash (FNV-1a) — used in cache key only, not security-sensitive.
  let h = 2166136261;
  for (let i = 0; i < block.length; i++) {
    h ^= block.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return { hash: (h >>> 0).toString(36), block };
}

export function compactTodayBlock(today: {
  cal: number;
  calTarget: number;
  burn: number;
  water: number;
  fastingActive: boolean;
  sleepH: number | null;
  workoutDone: boolean;
}): string {
  return `Hari:${Math.round(today.cal)}/${today.calTarget}kal,burn${Math.round(today.burn)},air${today.water}ml,${today.workoutDone ? "olahraga✓" : "olahraga–"},${today.fastingActive ? "puasa✓" : "puasa–"},tidur${today.sleepH != null ? today.sleepH.toFixed(1) + "j" : "-"}`;
}
