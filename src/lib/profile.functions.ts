import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

const UpdateSchema = z.object({
  full_name: z.string().min(1).max(100).optional(),
  gender: z.enum(["male", "female"]).optional(),
  birth_date: z.string().optional(),
  height_cm: z.number().min(80).max(250).optional(),
  weight_kg: z.number().min(20).max(300).optional(),
  target_weight_kg: z.number().min(20).max(300).optional(),
  activity_level: z.enum(["sedentary", "light", "moderate", "active", "very_active"]).optional(),
  dietary_preference: z.string().max(50).optional(),
  allergies: z.array(z.string().max(50)).max(20).optional(),
  health_conditions: z.array(z.string().max(50)).max(20).optional(),
  daily_calorie_target: z.number().min(800).max(6000).optional(),
  city: z.string().max(80).optional(),
  language: z.enum(["id", "en"]).optional(),
  onboarded: z.boolean().optional(),
});

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });