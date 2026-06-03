import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listWeight = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("weight_logs")
      .select("id, weight_kg, note, logged_at")
      .eq("user_id", userId)
      .order("logged_at", { ascending: false })
      .limit(90);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const addWeight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        weight_kg: z.number().min(20).max(400),
        note: z.string().max(300).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("weight_logs").insert({
      user_id: userId,
      weight_kg: data.weight_kg,
      note: data.note ?? null,
    });
    if (error) throw new Error(error.message);
    // Also sync profile current weight
    await supabase.from("profiles").update({ weight_kg: data.weight_kg }).eq("id", userId);
    return { ok: true };
  });

export const deleteWeight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("weight_logs")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });