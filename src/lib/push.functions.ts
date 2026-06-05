import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sendWebPushTo } from "./push.server";

const SubSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
  user_agent: z.string().max(500).optional(),
});

export const registerPushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => SubSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        user_agent: data.user_agent ?? null,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const unregisterPushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ endpoint: z.string().url() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userId)
      .eq("endpoint", data.endpoint);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendTestPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    if (!subs?.length) throw new Error("Belum ada device yang berlangganan");

    const results = await Promise.all(
      subs.map(async (s) => {
        try {
          await sendWebPushTo(s, {
            title: "HealthyU",
            body: "Notifikasi push berfungsi! 🎉",
            url: "/dashboard",
          });
          return { ok: true as const };
        } catch (e) {
          return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
        }
      }),
    );
    const failed = results.filter((r) => !r.ok);
    return { sent: results.length - failed.length, failed: failed.length };
    void context;
  });
