import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [plans, mine] = await Promise.all([
      supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_visible", true)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("user_subscriptions")
        .select("*, plan:subscription_plans(*)")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    return {
      plans: plans.data ?? [],
      current: mine.data ?? null,
    };
  });

const SubscribeSchema = z.object({
  plan_id: z.string().uuid(),
  billing_period: z.enum(["monthly", "yearly", "lifetime"]).default("monthly"),
});

export const subscribe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => SubscribeSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // cancel any existing active sub
    await supabase
      .from("user_subscriptions")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("status", "active");

    const now = new Date();
    const expires =
      data.billing_period === "lifetime"
        ? null
        : new Date(
            now.getTime() +
              (data.billing_period === "yearly" ? 365 : 30) * 86400000,
          ).toISOString();

    const { error } = await supabase.from("user_subscriptions").insert({
      user_id: userId,
      plan_id: data.plan_id,
      status: "active",
      payment_method: "demo",
      expires_at: expires,
    });
    if (error) throw new Error(error.message);

    await supabase
      .from("profiles")
      .update({ premium_status: "active", premium_expires_at: expires })
      .eq("id", userId);

    return { ok: true };
  });

export const cancelSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await supabase
      .from("user_subscriptions")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        auto_renew: false,
      })
      .eq("user_id", userId)
      .eq("status", "active");
    await supabase
      .from("profiles")
      .update({ premium_status: "free" })
      .eq("id", userId);
    return { ok: true };
  });