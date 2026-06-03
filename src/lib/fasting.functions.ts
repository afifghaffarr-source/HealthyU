import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { recordActivityFor } from "./gamification.functions";

export const currentFast = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("fasting_sessions")
      .select("*")
      .eq("user_id", userId)
      .is("end_time", null)
      .order("start_time", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const startFast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      protocol: z.string().max(20),
      target_hours: z.number().min(1).max(72),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // close existing first
    await supabase
      .from("fasting_sessions")
      .update({ end_time: new Date().toISOString() })
      .eq("user_id", userId)
      .is("end_time", null);
    const { error } = await supabase.from("fasting_sessions").insert({
      user_id: userId,
      protocol: data.protocol,
      target_hours: data.target_hours,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const stopFast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const end = new Date().toISOString();
    const { data: session } = await supabase
      .from("fasting_sessions")
      .select("start_time, target_hours")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    let completed = false;
    if (session) {
      const hrs = (Date.now() - new Date(session.start_time).getTime()) / 3600000;
      completed = hrs >= Number(session.target_hours);
    }
    const { error } = await supabase
      .from("fasting_sessions")
      .update({ end_time: end, completed })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    const game = completed ? await recordActivityFor(supabase, userId, "fast_completed") : null;
    return { ok: true, completed, game };
  });

export const fastHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("fasting_sessions")
      .select("id, protocol, target_hours, start_time, end_time, completed")
      .eq("user_id", userId)
      .not("end_time", "is", null)
      .order("start_time", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getFastingSchedule = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("fasting_schedules")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

const ScheduleSchema = z.object({
  fasting_type: z.string().min(1).max(20),
  is_ramadhan_mode: z.boolean().default(false),
  is_active: z.boolean().default(true),
  target_duration_hours: z.number().min(1).max(24).nullable().optional(),
  eating_window_start: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable().optional(),
  eating_window_end: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable().optional(),
  enabled_days: z.array(z.number().min(0).max(6)).max(7).default([]),
});

export const saveFastingSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ScheduleSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // deactivate existing
    await supabase.from("fasting_schedules").update({ is_active: false }).eq("user_id", userId);
    const { error } = await supabase.from("fasting_schedules").insert({
      user_id: userId,
      fasting_type: data.fasting_type,
      is_ramadhan_mode: data.is_ramadhan_mode,
      is_active: data.is_active,
      target_duration_hours: data.target_duration_hours ?? null,
      eating_window_start: data.eating_window_start ?? null,
      eating_window_end: data.eating_window_end ?? null,
      enabled_days: data.enabled_days as never,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });