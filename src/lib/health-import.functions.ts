import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Schema = z.object({
  source: z.enum(["apple_health", "samsung_health"]),
  steps: z
    .array(z.object({ day: z.string(), steps: z.number().int().min(0).max(200000) }))
    .max(2000)
    .default([]),
  weight: z
    .array(z.object({ logged_at: z.string(), weight_kg: z.number().min(20).max(400) }))
    .max(2000)
    .default([]),
  workouts: z
    .array(
      z.object({
        performed_at: z.string(),
        type: z.string().min(1).max(60),
        duration_min: z.number().int().min(1).max(600),
        calories_burned: z.number().int().min(0).max(5000).default(0),
      }),
    )
    .max(1000)
    .default([]),
});

export const importHealthData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => Schema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let stepsCount = 0;
    let weightCount = 0;
    let workoutCount = 0;

    if (data.steps.length) {
      const agg = new Map<string, number>();
      for (const s of data.steps) agg.set(s.day, (agg.get(s.day) ?? 0) + s.steps);
      const rows = Array.from(agg.entries()).map(([day, steps]) => ({
        user_id: userId,
        day,
        steps,
        source: data.source,
      }));
      for (const r of rows) {
        const { data: existing } = await supabase
          .from("daily_steps")
          .select("id, steps")
          .eq("user_id", userId)
          .eq("day", r.day)
          .maybeSingle();
        if (existing) {
          await supabase
            .from("daily_steps")
            .update({ steps: Math.max(Number(existing.steps), r.steps), source: data.source, updated_at: new Date().toISOString() })
            .eq("id", existing.id);
        } else {
          await supabase.from("daily_steps").insert(r);
        }
        stepsCount++;
      }
    }

    if (data.weight.length) {
      const rows = data.weight.map((w) => ({
        user_id: userId,
        logged_at: w.logged_at,
        weight_kg: w.weight_kg,
        note: `Imported from ${data.source}`,
      }));
      const { error } = await supabase.from("weight_logs").insert(rows);
      if (error) throw new Error(error.message);
      weightCount = rows.length;
    }

    if (data.workouts.length) {
      const rows = data.workouts.map((w) => ({
        user_id: userId,
        performed_at: w.performed_at,
        type: w.type,
        name: w.type,
        duration_min: w.duration_min,
        calories_burned: w.calories_burned,
        intensity: "medium" as const,
        notes: `Imported from ${data.source}`,
      }));
      const { error } = await supabase.from("workout_sessions").insert(rows);
      if (error) throw new Error(error.message);
      workoutCount = rows.length;
    }

    return { ok: true, stepsCount, weightCount, workoutCount };
  });