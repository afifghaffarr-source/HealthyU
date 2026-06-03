import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const addSchema = z
  .object({
    systolic: z.number().int().min(50).max(260).optional(),
    diastolic: z.number().int().min(30).max(180).optional(),
    heart_rate: z.number().int().min(20).max(250).optional(),
    glucose_mgdl: z.number().min(20).max(800).optional(),
    glucose_state: z.enum(["fasting", "post_meal", "random"]).optional(),
    note: z.string().max(300).optional(),
  })
  .refine(
    (v) =>
      v.systolic !== undefined ||
      v.diastolic !== undefined ||
      v.heart_rate !== undefined ||
      v.glucose_mgdl !== undefined,
    { message: "Isi setidaknya satu nilai" },
  );

export const listVitals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("vitals_logs")
      .select("id, systolic, diastolic, heart_rate, glucose_mgdl, glucose_state, note, logged_at")
      .eq("user_id", userId)
      .order("logged_at", { ascending: false })
      .limit(90);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const addVitals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => addSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("vitals_logs").insert({
      user_id: userId,
      systolic: data.systolic ?? null,
      diastolic: data.diastolic ?? null,
      heart_rate: data.heart_rate ?? null,
      glucose_mgdl: data.glucose_mgdl ?? null,
      glucose_state: data.glucose_state ?? null,
      note: data.note ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteVitals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("vitals_logs")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });