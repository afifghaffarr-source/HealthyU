import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listMood = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const since = new Date();
    since.setDate(since.getDate() - 29);
    since.setHours(0, 0, 0, 0);
    const { data, error } = await supabase
      .from("mood_logs")
      .select("id, mood, note, logged_at")
      .eq("user_id", userId)
      .gte("logged_at", since.toISOString())
      .order("logged_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const addMood = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        mood: z.number().int().min(1).max(5),
        note: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("mood_logs").insert({
      user_id: userId,
      mood: data.mood,
      note: data.note ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMood = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("mood_logs")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });