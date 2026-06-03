import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getNotifPrefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) return data;
    const { data: created, error } = await supabase
      .from("notification_preferences")
      .insert({ user_id: userId })
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return created;
  });

const time = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional().nullable();
const PrefsSchema = z.object({
  meal_reminder_enabled: z.boolean().optional(),
  meal_breakfast_time: time,
  meal_lunch_time: time,
  meal_dinner_time: time,
  water_reminder_enabled: z.boolean().optional(),
  water_interval_min: z.number().min(15).max(360).optional(),
  water_start_time: time,
  water_end_time: time,
  exercise_reminder_enabled: z.boolean().optional(),
  exercise_time: time,
  fasting_sahur_enabled: z.boolean().optional(),
  fasting_iftar_enabled: z.boolean().optional(),
  prayer_reminder_enabled: z.boolean().optional(),
  prayer_minutes_before: z.number().min(0).max(60).optional(),
  health_alert_enabled: z.boolean().optional(),
  weekly_report_enabled: z.boolean().optional(),
  weekly_report_day: z.number().min(0).max(6).optional(),
  social_enabled: z.boolean().optional(),
  achievement_enabled: z.boolean().optional(),
  challenge_enabled: z.boolean().optional(),
  system_enabled: z.boolean().optional(),
  marketing_enabled: z.boolean().optional(),
}).partial();

export const updateNotifPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => PrefsSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("notification_preferences")
      .update(data as never)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });