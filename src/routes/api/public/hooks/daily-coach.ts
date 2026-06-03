import { createFileRoute } from "@tanstack/react-router";
import { sendWebPushTo } from "@/lib/push.server";

// Daily AI Coach push notification dispatcher.
// Called by pg_cron daily (e.g. 07:00 WIB). Auth via Supabase anon key.

export const Route = createFileRoute("/api/public/hooks/daily-coach")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = request.headers.get("apikey");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
        if (!apiKey || !expected || apiKey !== expected) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: subs, error } = await supabaseAdmin
          .from("push_subscriptions")
          .select("id, user_id, endpoint, p256dh, auth");
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }

        let sent = 0;
        let failed = 0;
        const failedIds: string[] = [];

        const messages = [
          "Selamat pagi! Mulai hari dengan minum air & sarapan sehat.",
          "Pagi! Cek AI Coach kamu untuk rekomendasi hari ini.",
          "Hari baru, langkah baru. Yuk capai target kesehatan hari ini!",
          "Selamat pagi! Jangan lupa olahraga ringan & catat makananmu.",
        ];
        const body = messages[new Date().getDay() % messages.length];

        for (const s of subs ?? []) {
          try {
            await sendWebPushTo(
              { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
              {
                title: "🌅 AI Coach Pagi",
                body,
                url: "/coach",
                tag: "daily-coach",
              },
            );
            sent++;
          } catch (e) {
            failed++;
            const msg = e instanceof Error ? e.message : String(e);
            // Drop dead subscriptions (410 Gone / 404)
            if (msg.includes("410") || msg.includes("404")) {
              failedIds.push(s.id);
            }
          }
        }

        if (failedIds.length) {
          await supabaseAdmin.from("push_subscriptions").delete().in("id", failedIds);
        }

        return Response.json({
          ok: true,
          sent,
          failed,
          pruned: failedIds.length,
          timestamp: new Date().toISOString(),
        });
      },
    },
  },
});