import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const num = (min: number, max: number) => z.number().min(min).max(max).optional();

const AddSchema = z
  .object({
    weight_kg: num(20, 400),
    body_fat_pct: num(2, 70),
    muscle_mass_kg: num(5, 150),
    water_pct: num(20, 80),
    visceral_fat: num(0, 60),
    waist_cm: num(30, 200),
    hip_cm: num(30, 200),
    chest_cm: num(40, 200),
    bicep_left_cm: num(15, 80),
    bicep_right_cm: num(15, 80),
    thigh_left_cm: num(20, 120),
    thigh_right_cm: num(20, 120),
    neck_cm: num(20, 80),
    calf_cm: num(20, 80),
    notes: z.string().max(300).optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined && x !== ""), {
    message: "Isi minimal satu nilai",
  });

export const listBodyMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("body_metrics")
      .select("*")
      .eq("user_id", userId)
      .order("measured_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const addBodyMetrics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => AddSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("body_metrics").insert({
      user_id: userId,
      measure_date: today,
      source: "manual",
      ...data,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteBodyMetrics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("body_metrics")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });