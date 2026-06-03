import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TABLES = [
  "profiles",
  "meal_logs",
  "meal_plans",
  "water_logs",
  "weight_logs",
  "workout_sessions",
  "sleep_logs",
  "fasting_sessions",
  "mood_logs",
  "medications",
  "medication_logs",
  "vitals_logs",
  "progress_photos",
  "daily_steps",
  "chat_messages",
  "community_posts",
  "community_comments",
  "user_stats",
  "user_achievements",
] as const;

export const exportAllData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const out: Record<string, unknown> = {
      exported_at: new Date().toISOString(),
      user_id: userId,
    };
    for (const t of TABLES) {
      const query = supabase.from(t).select("*");
      const { data, error } =
        t === "profiles" ? await query.eq("id", userId) : await query.eq("user_id", userId);
      if (error) throw new Error(`${t}: ${error.message}`);
      out[t] = data ?? [];
    }
    return out;
  });