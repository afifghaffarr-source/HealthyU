import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { parseInput } from "@/lib/validation";

const PrivacySchema = z.object({
  public_profile: z.boolean().optional(),
  show_weight: z.boolean().optional(),
  show_meals: z.boolean().optional(),
  show_progress_photos: z.boolean().optional(),
  show_workouts: z.boolean().optional(),
  allow_dm: z.boolean().optional(),
});

export const getPrivacySettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "public_profile, show_weight, show_meals, show_progress_photos, show_workouts, allow_dm",
      )
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { settings: data };
  });

export const updatePrivacySettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => parseInput(PrivacySchema, i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch: Record<string, boolean> = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined),
    ) as Record<string, boolean>;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await supabase
      .from("profiles")
      .update(patch as never)
      .eq("id", userId);
    if (error) throw new Error(error.message);
    await supabase.rpc("log_audit_event", {
      _action: "privacy.updated",
      _entity: "profile",
      _meta: patch as never,
    });
    return { ok: true };
  });
