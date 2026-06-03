import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const weeklyReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ days: z.number().min(1).max(90).default(7) }).parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const since = new Date(Date.now() - data.days * 86400000).toISOString();

    const [meals, water, workouts, sleep, fasting] = await Promise.all([
      supabase.from("meal_logs").select("logged_at, calories, protein_g, carbs_g, fat_g, meal_type").eq("user_id", userId).gte("logged_at", since),
      supabase.from("water_logs").select("logged_at, amount_ml").eq("user_id", userId).gte("logged_at", since),
      supabase.from("workout_sessions").select("performed_at, name, duration_min, calories_burned, type").eq("user_id", userId).gte("performed_at", since),
      supabase.from("sleep_logs").select("sleep_start, sleep_end, quality").eq("user_id", userId).gte("sleep_end", since),
      supabase.from("fasting_sessions").select("start_time, end_time, target_hours, completed, protocol").eq("user_id", userId).gte("start_time", since),
    ]);

    return {
      meals: meals.data ?? [],
      water: water.data ?? [],
      workouts: workouts.data ?? [],
      sleep: sleep.data ?? [],
      fasting: fasting.data ?? [],
    };
  });