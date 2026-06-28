import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  computeIftarCountdown,
  computeSahurCountdown,
  pickSafeFastingNudge,
  type PuasaAmanContext,
  type PuasaAmanNudge,
  type Countdown,
} from "./puasaAman";

/**
 * Sprint 29 — server fn: aggregate a single PuasaAman widget payload.
 *
 * Joins:
 *   - active fasting_sessions (latest, end_time IS NULL)
 *   - last_water_log timestamp
 *   - last meal_log timestamp
 *   - user fasting schedule (imsak, iftar)
 *   - Hijri today's month for ramadhan-mode hint
 *
 * Ponytail rationale: piggybacks on existing tables — fasting_sessions,
 * fasting_schedules-equivalent (or user-profiles JSON), water_logs,
 * meal_logs. NO new snapshot table.
 */

interface FastingRow {
  id: string;
  start_time: string;
  target_hours: number | null;
}
interface WaterLogRow {
  logged_at: string;
  amount_ml: number;
}
interface MealLogRow {
  logged_at: string;
}
interface FastingScheduleRow {
  eating_window_start: string | null;
  eating_window_end: string | null;
  is_ramadhan_mode: boolean | null;
  is_active: boolean | null;
}

function hoursSince(iso: string, nowMs: number): number {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return Infinity;
  return (nowMs - t) / 3600000;
}

export const getPuasaAmanWidget = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({}).parse(d ?? {}))
  .handler(
    async ({
      context,
    }): Promise<{
      iftar: Countdown;
      sahur: Countdown;
      nudge: PuasaAmanNudge;
      activeFast: boolean;
      inRamadhanMode: boolean;
      elapsedHours: number;
      targetHours: number;
    }> => {
      const { supabase, userId } = context;
      const now = new Date();
      const nowMs = now.getTime();
      const hour24 = now.getHours() + now.getMinutes() / 60;

      const [activeRes, waterRes, mealRes, scheduleRes] = await Promise.all([
        supabase
          .from("fasting_sessions")
          .select("id, start_time, target_hours")
          .eq("user_id", userId)
          .is("end_time", null)
          .order("start_time", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("water_logs")
          .select("logged_at, amount_ml")
          .eq("user_id", userId)
          .order("logged_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("meal_logs")
          .select("logged_at")
          .eq("user_id", userId)
          .order("logged_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("fasting_schedules")
          .select("eating_window_start, eating_window_end, is_ramadhan_mode, is_active")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

      const active: FastingRow | null = (activeRes.data as FastingRow | null) ?? null;
      const water: WaterLogRow | null = (waterRes.data as WaterLogRow | null) ?? null;
      const meal: MealLogRow | null = (mealRes.data as MealLogRow | null) ?? null;
      const sched: FastingScheduleRow | null =
        (scheduleRes.data as FastingScheduleRow | null) ?? null;

      const elapsedHours = active ? hoursSince(active.start_time, nowMs) : 0;
      const targetHours = active?.target_hours ?? 14;
      const lastWaterLogHoursAgo = water ? hoursSince(water.logged_at, nowMs) : 99;
      const lastMealHoursAgo = meal ? hoursSince(meal.logged_at, nowMs) : 99;
      const inRamadhanMode = Boolean(sched?.is_ramadhan_mode);

      const iftarHhmm = sched?.eating_window_start?.slice(0, 5) ?? "18:15";
      const imsakHhmm = sched?.eating_window_end?.slice(0, 5) ?? "04:30";

      const ctx: PuasaAmanContext = {
        nowIso: now.toISOString(),
        hour24,
        iftarHhmm,
        imsakHhmm,
        activeFast: Boolean(active),
        elapsedHours,
        targetHours,
        lastWaterLogHoursAgo,
        lastMealHoursAgo,
        hoursActiveConsecutiveDays: 0,
        inRamadhanMode,
      };

      return {
        iftar: computeIftarCountdown(ctx),
        sahur: computeSahurCountdown(ctx),
        nudge: pickSafeFastingNudge(ctx),
        activeFast: ctx.activeFast,
        inRamadhanMode,
        elapsedHours,
        targetHours,
      };
    },
  );
