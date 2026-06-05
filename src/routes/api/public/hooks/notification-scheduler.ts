import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendWebPushTo } from "@/features/notifications/lib/push.server";
import { requireCronSecret } from "@/lib/cronAuth.server";

// Cron-friendly scheduler. Runs frequently (e.g. every 5 minutes) and sends
// pushes when the current time matches a user's preference window (±3 minutes).

type Pref = {
  user_id: string;
  timezone: string | null;
  meal_reminder_enabled: boolean;
  meal_breakfast_time: string | null;
  meal_lunch_time: string | null;
  meal_dinner_time: string | null;
  water_reminder_enabled: boolean;
  water_interval_min: number | null;
  water_start_time: string | null;
  water_end_time: string | null;
  exercise_reminder_enabled: boolean;
  exercise_time: string | null;
};

function minutesFromHHMM(s: string | null): number | null {
  if (!s) return null;
  const [h, m] = s.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

/**
 * Returns the current minute-of-day in the user's IANA timezone.
 * Falls back to Asia/Jakarta if the timezone is missing/invalid.
 */
function nowMinutesInTz(now: Date, tz: string | null): number {
  const zone = tz && tz.length > 0 ? tz : "Asia/Jakarta";
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(now);
    const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
    const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
    return (h % 24) * 60 + m;
  } catch {
    return now.getUTCHours() * 60 + now.getUTCMinutes();
  }
}

export const Route = createFileRoute("/api/public/hooks/notification-scheduler")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = requireCronSecret(request);
        if (unauthorized) return unauthorized;

        const now = new Date();
        const WINDOW = 3;

        const { data: prefs } = await supabaseAdmin
          .from("notification_preferences")
          .select(
            "user_id, timezone, meal_reminder_enabled, meal_breakfast_time, meal_lunch_time, meal_dinner_time, water_reminder_enabled, water_interval_min, water_start_time, water_end_time, exercise_reminder_enabled, exercise_time",
          );

        let sent = 0;
        let errors = 0;

        for (const p of (prefs ?? []) as Pref[]) {
          const nowMin = nowMinutesInTz(now, p.timezone);
          const toSend: { title: string; body: string; url?: string; tag: string }[] = [];

          if (p.meal_reminder_enabled) {
            const meals: [string | null, string, string][] = [
              [p.meal_breakfast_time, "Saatnya Sarapan 🍳", "Catat sarapan kamu sekarang"],
              [p.meal_lunch_time, "Saatnya Makan Siang 🍱", "Jangan lupa catat makan siang"],
              [p.meal_dinner_time, "Saatnya Makan Malam 🥗", "Catat makan malam kamu"],
            ];
            for (const [t, title, body] of meals) {
              const m = minutesFromHHMM(t);
              if (m !== null && Math.abs(m - nowMin) <= WINDOW) {
                toSend.push({ title, body, url: "/food", tag: `meal-${title}` });
              }
            }
          }

          if (p.water_reminder_enabled) {
            const start = minutesFromHHMM(p.water_start_time) ?? 0;
            const end = minutesFromHHMM(p.water_end_time) ?? 24 * 60;
            const interval = p.water_interval_min ?? 90;
            if (nowMin >= start && nowMin <= end) {
              const diff = nowMin - start;
              if (diff % interval <= WINDOW) {
                toSend.push({
                  title: "Minum Air 💧",
                  body: "Waktunya hidrasi",
                  url: "/water",
                  tag: "water",
                });
              }
            }
          }

          if (p.exercise_reminder_enabled) {
            const m = minutesFromHHMM(p.exercise_time);
            if (m !== null && Math.abs(m - nowMin) <= WINDOW) {
              toSend.push({
                title: "Saatnya Olahraga 🏃",
                body: "Yuk gerak sebentar",
                url: "/workout",
                tag: "exercise",
              });
            }
          }

          if (toSend.length === 0) continue;

          const { data: subs } = await supabaseAdmin
            .from("push_subscriptions")
            .select("endpoint, p256dh, auth")
            .eq("user_id", p.user_id);

          for (const sub of subs ?? []) {
            for (const payload of toSend) {
              try {
                await sendWebPushTo(sub, payload);
                sent++;
              } catch {
                errors++;
              }
            }
          }
        }

        return Response.json({ ok: true, sent, errors });
      },
    },
  },
});
