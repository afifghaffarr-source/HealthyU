import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const LogSchema = z.object({
  sleep_start: z.string().datetime(),
  sleep_end: z.string().datetime(),
  quality: z.number().int().min(1).max(5).default(3),
  notes: z.string().max(300).nullable().optional(),
});

export const logSleep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => LogSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (new Date(data.sleep_end) <= new Date(data.sleep_start)) {
      throw new Error("Waktu bangun harus setelah waktu tidur");
    }
    const { error } = await supabase.from("sleep_logs").insert({ ...data, user_id: userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const recentSleep = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const since = new Date(Date.now() - 14 * 86400000).toISOString();
    const { data, error } = await supabase
      .from("sleep_logs")
      .select("*")
      .eq("user_id", userId)
      .gte("sleep_end", since)
      .order("sleep_end", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const deleteSleep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("sleep_logs")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
