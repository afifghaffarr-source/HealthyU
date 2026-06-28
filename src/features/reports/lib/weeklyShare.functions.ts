import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildWeeklyShareCard } from "./weeklyShareCard";

/**
 * Sprint 28 — server fn: aggregate last-7-day totals into a WeeklyShareCard.
 *
 * Pure DB read, no AI. Reuses meal_logs / water_logs / workout_sessions
 * and the user profile. Piggybacks on existing reporting infra rather than
 * creating a new snapshot table (cron 3/3 full, KV writes 1K/day limit).
 */

interface MealRow {
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  meal_type: string | null;
  logged_at: string;
}
interface WaterRow {
  amount_ml: number | null;
  logged_at: string;
}
interface WorkoutRow {
  duration_min: number | null;
  performed_at: string;
}

function sumN<T>(rows: T[], field: keyof T): number {
  let n = 0;
  for (const r of rows) {
    const v = Number(r[field]);
    if (Number.isFinite(v)) n += v;
  }
  return n;
}

const MEAL_TYPE_LABEL: Record<string, string> = {
  breakfast: "Sarapan",
  lunch: "Makan siang",
  dinner: "Makan malam",
  snack: "Cemilan",
};

export const getWeeklyShareSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({}).parse(d ?? {}))
  .handler(async ({ context }) => {
    const { supabase } = context;
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    const weekStart = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
    const weekEnd = new Date().toISOString().slice(0, 10);

    const [mealsRes, watersRes, workoutsRes, profileRes] = await Promise.all([
      supabase
        .from("meal_logs")
        .select("calories, protein_g, carbs_g, fat_g, meal_type, logged_at")
        .gte("logged_at", since),
      supabase.from("water_logs").select("amount_ml, logged_at").gte("logged_at", since),
      supabase
        .from("workout_sessions")
        .select("duration_min, performed_at")
        .gte("performed_at", since),
      supabase.from("profiles").select("display_name, goal_calories_per_day").maybeSingle(),
    ]);

    const meals: MealRow[] = Array.isArray(mealsRes.data) ? (mealsRes.data as MealRow[]) : [];
    const waters: WaterRow[] = Array.isArray(watersRes.data) ? (watersRes.data as WaterRow[]) : [];
    const workouts: WorkoutRow[] = Array.isArray(workoutsRes.data)
      ? (workoutsRes.data as WorkoutRow[])
      : [];

    const totalCalories = sumN(meals, "calories");
    const totalProteinG = sumN(meals, "protein_g");
    const totalCarbsG = sumN(meals, "carbs_g");
    const totalFatG = sumN(meals, "fat_g");
    const totalWaterMl = sumN(waters, "amount_ml");
    const totalWorkoutMinutes = sumN(workouts, "duration_min");

    const daySet = new Set<string>();
    meals.forEach((r) => daySet.add(r.logged_at.slice(0, 10)));
    waters.forEach((r) => daySet.add(r.logged_at.slice(0, 10)));
    workouts.forEach((r) => daySet.add(r.performed_at.slice(0, 10)));
    const daysActive = daySet.size;
    const longestStreakDays = computeLongestStreak(Array.from(daySet).sort());

    const mealTypeCounts = new Map<string, number>();
    meals.forEach((r) => {
      const t = r.meal_type ?? "snack";
      mealTypeCounts.set(t, (mealTypeCounts.get(t) ?? 0) + 1);
    });
    const topMealType =
      Array.from(mealTypeCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const topMealLabel = topMealType ? (MEAL_TYPE_LABEL[topMealType] ?? null) : null;

    const pro = (profileRes.data ?? {}) as {
      display_name?: string;
      goal_calories_per_day?: number;
    };
    const userName = pro.display_name ?? "Kamu";
    const goalCaloriesPerDay = pro.goal_calories_per_day ?? 2000;

    const card = buildWeeklyShareCard({
      userName,
      weekStart,
      weekEnd,
      totalCalories,
      totalProteinG,
      totalCarbsG,
      totalFatG,
      totalWaterMl,
      totalWorkoutMinutes,
      daysActive,
      daysInWeek: 7,
      longestStreakDays,
      topMealLabel,
      goalCaloriesPerDay,
    });

    return { ...card, userName, weekStart, weekEnd };
  });

function computeLongestStreak(sortedDays: string[]): number {
  let max = 0;
  let cur = 0;
  let prev: string | null = null;
  const dayMs = 86400000;
  for (const d of sortedDays) {
    if (prev === null) cur = 1;
    else {
      const diff = (new Date(d).getTime() - new Date(prev).getTime()) / dayMs;
      cur = diff <= 1.5 ? cur + 1 : 1;
    }
    max = Math.max(max, cur);
    prev = d;
  }
  return max;
}
