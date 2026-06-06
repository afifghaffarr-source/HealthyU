import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { todayRange } from "@/lib/health";

type SB = SupabaseClient<Database>;

export async function fetchChatContext(supabase: SB, userId: string) {
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
  return {
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
  };
}
