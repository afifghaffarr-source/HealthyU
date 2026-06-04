// Local-first calculators — no AI calls, no DB calls.
// Safe to import from both client and server. Use these instead of asking
// the LLM for numbers it can compute deterministically.

export type Gender = "male" | "female" | string;
export type ActivityLevel =
  | "sedentary"
  | "light"
  | "lightly_active"
  | "moderate"
  | "moderately_active"
  | "active"
  | "very_active"
  | "extra_active"
  | "athlete";

export type Goal = "lose" | "maintain" | "gain";

const ACTIVITY_MULT: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  lightly_active: 1.375,
  moderate: 1.55,
  moderately_active: 1.55,
  active: 1.725,
  very_active: 1.725,
  extra_active: 1.9,
  athlete: 1.9,
};

const MALE_TERMS = new Set(["male", "m", "laki-laki", "pria"]);

function isMale(gender?: Gender | null) {
  return !!gender && MALE_TERMS.has(String(gender).toLowerCase());
}

/** BMI = kg / m^2 */
export function bmi(weightKg: number, heightCm: number): number {
  if (!weightKg || !heightCm) return 0;
  const h = heightCm / 100;
  return Math.round((weightKg / (h * h)) * 10) / 10;
}

export function bmiCategory(value: number): "underweight" | "normal" | "overweight" | "obese" {
  if (value < 18.5) return "underweight";
  if (value < 25) return "normal";
  if (value < 30) return "overweight";
  return "obese";
}

export function idealWeightRange(heightCm: number): { min: number; max: number } {
  const h = heightCm / 100;
  return {
    min: Math.round(18.5 * h * h * 10) / 10,
    max: Math.round(24.9 * h * h * 10) / 10,
  };
}

/** Mifflin-St Jeor */
export function bmr(opts: {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  gender?: Gender | null;
}): number {
  const { weightKg, heightCm, ageYears, gender } = opts;
  if (!weightKg || !heightCm || !ageYears) return 0;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return Math.round(isMale(gender) ? base + 5 : base - 161);
}

export function tdee(bmrValue: number, activity: ActivityLevel | string): number {
  const mult = ACTIVITY_MULT[String(activity).toLowerCase()] ?? 1.2;
  return Math.round(bmrValue * mult);
}

/** Daily calorie target by goal: lose -500, gain +300 */
export function calorieTarget(tdeeValue: number, goal: Goal = "maintain"): number {
  if (goal === "lose") return Math.max(1200, tdeeValue - 500);
  if (goal === "gain") return tdeeValue + 300;
  return tdeeValue;
}

/** Macros split: 30% protein, 40% carbs, 30% fat. Returns grams. */
export function macros(targetCal: number): { protein_g: number; carbs_g: number; fat_g: number } {
  return {
    protein_g: Math.round((targetCal * 0.3) / 4),
    carbs_g: Math.round((targetCal * 0.4) / 4),
    fat_g: Math.round((targetCal * 0.3) / 9),
  };
}

/** Water target in ml: 35 ml/kg, +500ml if active */
export function waterTargetMl(weightKg: number, activity?: ActivityLevel | string): number {
  if (!weightKg) return 2000;
  const base = Math.round(weightKg * 35);
  const mult = activity ? ACTIVITY_MULT[String(activity).toLowerCase()] ?? 1.2 : 1.2;
  return mult >= 1.55 ? base + 500 : base;
}

/** Years between birth date and today */
export function ageFromBirthDate(birthDate: string | Date | null | undefined): number {
  if (!birthDate) return 0;
  const d = typeof birthDate === "string" ? new Date(birthDate) : birthDate;
  if (Number.isNaN(d.getTime())) return 0;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

/** Simple 0-100 health score from common signals */
export function healthScore(opts: {
  bmi?: number;
  steps?: number;
  sleepHours?: number;
  waterMl?: number;
  waterTargetMl?: number;
}): number {
  let score = 0;
  if (opts.bmi && opts.bmi >= 18.5 && opts.bmi < 25) score += 25;
  else if (opts.bmi) score += 10;
  if (opts.steps && opts.steps >= 10000) score += 25;
  else if (opts.steps && opts.steps >= 6000) score += 15;
  if (opts.sleepHours && opts.sleepHours >= 7 && opts.sleepHours <= 9) score += 25;
  else if (opts.sleepHours && opts.sleepHours >= 6) score += 12;
  if (opts.waterMl && opts.waterTargetMl) {
    const ratio = opts.waterMl / opts.waterTargetMl;
    score += Math.min(25, Math.round(ratio * 25));
  }
  return Math.min(100, score);
}

/** Streak: count consecutive days ending today from a sorted list of YYYY-MM-DD strings */
export function streakDays(dates: string[]): number {
  if (!dates.length) return 0;
  const set = new Set(dates);
  let count = 0;
  const d = new Date();
  for (;;) {
    const key = d.toISOString().slice(0, 10);
    if (!set.has(key)) break;
    count++;
    d.setDate(d.getDate() - 1);
  }
  return count;
}