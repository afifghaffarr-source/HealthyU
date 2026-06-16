import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ===== Get current subscription (default free) =====

export const getSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    return { sub: data ?? { tier: "free", status: "active" } };
  });

// ===== Upgrade subscription tier (30-day period) =====

export const upgradeSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ tier: z.enum(["free", "pro", "ultimate"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const periodEnd = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
    const { error } = await context.supabase.from("subscriptions").upsert(
      {
        user_id: context.userId,
        tier: data.tier,
        status: "active",
        current_period_end: periodEnd,
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true, tier: data.tier };
  });
