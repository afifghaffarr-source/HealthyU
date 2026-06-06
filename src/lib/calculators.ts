// Pure calculators used by /kalkulator/* SEO landing pages.

export function calcBMI(weightKg: number, heightCm: number): number {
  const h = heightCm / 100;
  return weightKg / (h * h);
}

export function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return "Berat badan kurang";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Berat badan berlebih";
  return "Obesitas";
}

export function calcBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: "male" | "female",
): number {
  // Mifflin-St Jeor
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

export const ACTIVITY: Record<string, { label: string; factor: number }> = {
  sedentary: { label: "Tidak aktif", factor: 1.2 },
  light: { label: "Ringan (1-3x/minggu)", factor: 1.375 },
  moderate: { label: "Sedang (3-5x/minggu)", factor: 1.55 },
  active: { label: "Aktif (6-7x/minggu)", factor: 1.725 },
  veryActive: { label: "Sangat aktif (atlet)", factor: 1.9 },
};

export function calcTDEE(bmr: number, activity: keyof typeof ACTIVITY): number {
  return bmr * ACTIVITY[activity].factor;
}

export function calcBodyFat(bmi: number, age: number, sex: "male" | "female"): number {
  // Deurenberg formula
  const s = sex === "male" ? 1 : 0;
  return 1.2 * bmi + 0.23 * age - 10.8 * s - 5.4;
}

export function calcIdealWeight(heightCm: number, sex: "male" | "female"): number {
  // Devine formula
  const inchesOver5ft = Math.max(0, (heightCm - 152.4) / 2.54);
  return sex === "male" ? 50 + 2.3 * inchesOver5ft : 45.5 + 2.3 * inchesOver5ft;
}

export function calcWaterIntake(weightKg: number, activity: keyof typeof ACTIVITY): number {
  // ml per day
  const base = weightKg * 35;
  const bonus = activity === "active" || activity === "veryActive" ? 500 : 0;
  return base + bonus;
}

export interface Macros {
  protein: number;
  carbs: number;
  fat: number;
}

export function calcMacros(
  tdee: number,
  goal: "cut" | "maintain" | "bulk",
): { calories: number; macros: Macros } {
  const calories = goal === "cut" ? tdee - 500 : goal === "bulk" ? tdee + 300 : tdee;
  // 30/40/30 protein/carb/fat
  const protein = (calories * 0.3) / 4;
  const carbs = (calories * 0.4) / 4;
  const fat = (calories * 0.3) / 9;
  return { calories, macros: { protein, carbs, fat } };
}

export function calcHeartRateZones(age: number): {
  max: number;
  zones: { name: string; min: number; max: number }[];
} {
  const max = 220 - age;
  return {
    max,
    zones: [
      { name: "Zona 1 (50-60%) Pemulihan", min: max * 0.5, max: max * 0.6 },
      { name: "Zona 2 (60-70%) Bakar lemak", min: max * 0.6, max: max * 0.7 },
      { name: "Zona 3 (70-80%) Aerobik", min: max * 0.7, max: max * 0.8 },
      { name: "Zona 4 (80-90%) Ambang batas", min: max * 0.8, max: max * 0.9 },
      { name: "Zona 5 (90-100%) Maksimal", min: max * 0.9, max },
    ],
  };
}
