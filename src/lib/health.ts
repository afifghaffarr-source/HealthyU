// Health calculators: BMI, BMR, TDEE + fasting protocols.

export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";

const ACTIVITY_MULT: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export function calcAge(birthDate: string | Date | null | undefined): number {
  if (!birthDate) return 30;
  const d = new Date(birthDate);
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

export function calcBMI(weightKg: number, heightCm: number): number {
  const h = heightCm / 100;
  return +(weightKg / (h * h)).toFixed(1);
}

export function bmiCategory(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: "Underweight", color: "text-blue-500" };
  if (bmi < 25) return { label: "Normal", color: "text-sage" };
  if (bmi < 30) return { label: "Overweight", color: "text-coral" };
  return { label: "Obese", color: "text-destructive" };
}

// Mifflin-St Jeor
export function calcBMR(opts: {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: "male" | "female";
}): number {
  const base = 10 * opts.weightKg + 6.25 * opts.heightCm - 5 * opts.age;
  return Math.round(opts.gender === "male" ? base + 5 : base - 161);
}

export function calcTDEE(bmr: number, activity: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULT[activity]);
}

export const FASTING_PROTOCOLS = [
  { id: "16:8", label: "16:8 Leangains", fast: 16, eat: 8 },
  { id: "18:6", label: "18:6", fast: 18, eat: 6 },
  { id: "20:4", label: "20:4 Warrior", fast: 20, eat: 4 },
  { id: "OMAD", label: "OMAD", fast: 23, eat: 1 },
  { id: "ramadhan", label: "Puasa Ramadhan (Subuh–Maghrib)", fast: 14, eat: 10 },
] as const;

export function fastingStage(hoursElapsed: number): string {
  if (hoursElapsed < 4) return "Anabolic — masih mencerna";
  if (hoursElapsed < 12) return "Catabolic — gula darah turun";
  if (hoursElapsed < 16) return "Fat burning — bakar lemak";
  if (hoursElapsed < 24) return "Ketosis — produksi keton";
  return "Autophagy — pembersihan sel";
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}
