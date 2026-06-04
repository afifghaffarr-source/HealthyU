import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  method: z.number().int().min(0).max(20).optional(),
});

export const getPrayerTimes = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => InputSchema.parse(i))
  .handler(async ({ data }) => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const yyyy = today.getFullYear();
    const url = `https://api.aladhan.com/v1/timings/${dd}-${mm}-${yyyy}?latitude=${data.lat}&longitude=${data.lng}&method=${data.method ?? 20}`;
    try {
      const res = await fetch(url);
      if (!res.ok) return { ok: false as const, error: `HTTP ${res.status}` };
      const json = (await res.json()) as { data?: { timings?: Record<string, string> } };
      const t = json?.data?.timings ?? {};
      return {
        ok: true as const,
        timings: {
          Fajr: t.Fajr ?? "-",
          Sunrise: t.Sunrise ?? "-",
          Dhuhr: t.Dhuhr ?? "-",
          Asr: t.Asr ?? "-",
          Maghrib: t.Maghrib ?? "-",
          Isha: t.Isha ?? "-",
        },
      };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "fetch failed" };
    }
  });
