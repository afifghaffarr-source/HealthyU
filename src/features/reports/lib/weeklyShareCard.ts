/**
 * Sprint 28 — Weekly Wrap-Up shareable card derivation.
 *
 * Pure mapping helper. Takes already-aggregated raw totals (server fn
 * does the DB query) and produces a stable share-card payload: daily
 * averages, calorie goal %, activity score, and Indonesian headline +
 * tagline. Zero AI cost — pure arithmetic + curated strings.
 *
 * Ponytail rationale: every share button across this product now runs
 * through ONE helper. Adding a share variant later (TikTok caption,
 * Instagram story text, WA short link) means adding one more branch
 * here, not editing N call sites.
 */

export interface WeeklyShareInputs {
  userName: string;
  weekStart: string; // ISO date
  weekEnd: string; // ISO date
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  totalWaterMl: number;
  totalWorkoutMinutes: number;
  daysActive: number; // 0..daysInWeek
  daysInWeek: number; // typically 7
  longestStreakDays: number;
  topMealLabel: string | null;
  goalCaloriesPerDay: number;
}

export interface WeeklyShareCard {
  avgCaloriesPerDay: number;
  avgProteinGPerDay: number;
  avgWaterMlPerDay: number;
  avgWorkoutMinPerDay: number;
  calorieGoalPct: number; // 0..100, capped
  activityScore: number; // 0..100
  daysActive: number;
  daysInWeek: number;
  headline: string; // Indonesian main message
  shareTagline: string; // ≤120 chars, includes userName
  weekLabel: string; // "Minggu 23–29 Juni"
}

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function pickHeadline(input: WeeklyShareInputs, activityScore: number): string {
  // Dominant-axis winner: workout minutes vs calorie goals.
  const minutesPerDay = input.daysInWeek > 0 ? input.totalWorkoutMinutes / input.daysInWeek : 0;
  const minutesDominant = minutesPerDay >= 30;
  const calorieDominant = input.totalCalories >= input.goalCaloriesPerDay * input.daysInWeek * 0.85;

  if (input.daysActive === 0) {
    return `Minggu yang tenang — siap bangkit lagi?`;
  }
  if (minutesDominant && activityScore >= 80) {
    return `Minggu luar biasa — ${input.totalWorkoutMinutes} menit latihan!`;
  }
  if (calorieDominant && input.daysActive >= input.daysInWeek - 1) {
    return `Konsisten penuh — capai ${input.daysActive}/${input.daysInWeek} hari!`;
  }
  if (input.longestStreakDays >= 4) {
    return `Streak ${input.longestStreakDays} hari berturut-turut!`;
  }
  if (activityScore >= 60) {
    return `Minggu produktif — pertahankan ritme!`;
  }
  return `Minggu lumayan — ada progress, masih bisa lebih.`;
}

export function buildWeeklyShareCard(input: WeeklyShareInputs): WeeklyShareCard {
  const days = input.daysInWeek > 0 ? input.daysInWeek : 1;
  const avgCaloriesPerDay = Math.round(input.totalCalories / days);
  const avgProteinGPerDay = Math.round((input.totalProteinG / days) * 10) / 10;
  const avgWaterMlPerDay = Math.round(input.totalWaterMl / days);
  const avgWorkoutMinPerDay = Math.round(input.totalWorkoutMinutes / days);

  const goalTotal = input.goalCaloriesPerDay * days;
  const calorieGoalPct = goalTotal > 0 ? clampPct((input.totalCalories / goalTotal) * 100) : 0;

  // Activity score = (60% consistency + 40% workout volume). Both 0..100.
  const consistencyScore = clampPct((input.daysActive / days) * 100);
  const workoutScore = clampPct(Math.min((input.totalWorkoutMinutes / (days * 30)) * 100, 100));
  const activityScore = clampPct(consistencyScore * 0.6 + workoutScore * 0.4);

  const headline = pickHeadline(input, activityScore);

  const topMeal = input.topMealLabel ? ` · Top: ${input.topMealLabel}` : "";
  const shareTagline =
    `Minggu ${input.userName}: ${avgCaloriesPerDay}kkal/hari, ${avgWorkoutMinPerDay}m latihan${topMeal}`.slice(
      0,
      120,
    );

  const weekLabel = formatWeekLabel(input.weekStart, input.weekEnd);

  return {
    avgCaloriesPerDay,
    avgProteinGPerDay,
    avgWaterMlPerDay,
    avgWorkoutMinPerDay,
    calorieGoalPct,
    activityScore,
    daysActive: input.daysActive,
    daysInWeek: input.daysInWeek,
    headline,
    shareTagline,
    weekLabel,
  };
}

const MONTHS_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function formatWeekLabel(start: string, end: string): string {
  try {
    const s = new Date(start);
    const e = new Date(end);
    if (!Number.isFinite(s.getTime()) || !Number.isFinite(e.getTime())) return `${start}–${end}`;
    const dayS = s.getUTCDate();
    const dayE = e.getUTCDate();
    const monthS = MONTHS_ID[s.getUTCMonth()] ?? "";
    const year = s.getUTCFullYear();
    return `Minggu ${dayS}–${dayE} ${monthS} ${year}`;
  } catch {
    return `${start}–${end}`;
  }
}
