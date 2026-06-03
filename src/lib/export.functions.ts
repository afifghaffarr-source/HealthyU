import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type ExportPayload = {
  exported_at: string;
  user_id: string;
  tables: Record<string, unknown[]>;
};

const USER_TABLES = [
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
  .handler(async ({ context }): Promise<ExportPayload> => {
    const { supabase, userId } = context;
    const tables: Record<string, unknown[]> = {};

    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId);
    if (pErr) throw new Error(`profiles: ${pErr.message}`);
    tables.profiles = profile ?? [];

    for (const t of USER_TABLES) {
      const { data, error } = await supabase
        .from(t)
        .select("*")
        .eq("user_id", userId);
      if (error) throw new Error(`${t}: ${error.message}`);
      tables[t] = data ?? [];
    }

    return {
      exported_at: new Date().toISOString(),
      user_id: userId,
      tables,
    };
  });