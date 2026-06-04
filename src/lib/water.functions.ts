import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { todayRange } from "./health";
import { recordActivityFor } from "./gamification.functions";

export const todaysWater = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { start, end } = todayRange();
    const { data, error } = await supabase
      .from("water_logs")
      .select("amount_ml")
      .eq("user_id", userId)
      .gte("logged_at", start)
      .lt("logged_at", end);
    if (error) throw new Error(error.message);
    return (data ?? []).reduce((sum, r) => sum + (r.amount_ml ?? 0), 0);
  });

export const logWater = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ amount_ml: z.number().int().min(50).max(2000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("water_logs")
      .insert({ user_id: userId, amount_ml: data.amount_ml });
    if (error) throw new Error(error.message);
    const game = await recordActivityFor(supabase, userId, "water_logged");
    return { ok: true, game };
  });

export const todaysWaterEntries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { start, end } = todayRange();
    const { data, error } = await supabase
      .from("water_logs")
      .select("id, amount_ml, logged_at")
      .eq("user_id", userId)
      .gte("logged_at", start)
      .lt("logged_at", end)
      .order("logged_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const deleteWater = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("water_logs")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const weekWaterHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const since = new Date();
    since.setDate(since.getDate() - 6);
    since.setHours(0, 0, 0, 0);
    const { data, error } = await supabase
      .from("water_logs")
      .select("amount_ml, logged_at")
      .eq("user_id", userId)
      .gte("logged_at", since.toISOString())
      .order("logged_at", { ascending: true });
    if (error) throw new Error(error.message);
    const days: { date: string; total_ml: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      days.push({ date: key, total_ml: 0 });
    }
    (data ?? []).forEach((r) => {
      const key = new Date(r.logged_at as string).toISOString().slice(0, 10);
      const slot = days.find((x) => x.date === key);
      if (slot) slot.total_ml += r.amount_ml ?? 0;
    });
    return days;
  });
