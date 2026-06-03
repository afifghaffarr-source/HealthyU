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