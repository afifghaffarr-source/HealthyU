import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MedSchema = z.object({
  name: z.string().min(1).max(80),
  dose: z.string().max(40).nullable().optional(),
  frequency: z.enum(["daily", "weekly", "as_needed"]).default("daily"),
  times: z.array(z.string().regex(/^\d{2}:\d{2}$/)).max(8).default([]),
  notes: z.string().max(300).nullable().optional(),
});

export const listMedications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    const [{ data: meds }, { data: logs }] = await Promise.all([
      supabase
        .from("medications")
        .select("*")
        .eq("user_id", userId)
        .eq("active", true)
        .order("created_at", { ascending: true }),
      supabase
        .from("medication_logs")
        .select("medication_id, scheduled_time, scheduled_date, taken_at")
        .eq("user_id", userId)
        .eq("scheduled_date", today),
    ]);
    return { medications: meds ?? [], todayLogs: logs ?? [], today };
  });

export const addMedication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => MedSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("medications")
      .insert({ ...data, user_id: userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMedication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("medications")
      .update({ active: false })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markMedicationTaken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        medication_id: z.string().uuid(),
        scheduled_time: z.string().regex(/^\d{2}:\d{2}$/),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("medication_logs").insert({
      user_id: userId,
      medication_id: data.medication_id,
      scheduled_time: data.scheduled_time,
      scheduled_date: today,
    });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return { ok: true };
  });