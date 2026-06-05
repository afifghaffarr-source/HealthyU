import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const adjustPortion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { baseCalories: number; multiplier: number }) =>
    z
      .object({ baseCalories: z.number().positive(), multiplier: z.number().min(0.1).max(5) })
      .parse(d),
  )
  .handler(async ({ data }) => {
    return { adjustedCalories: Math.round(data.baseCalories * data.multiplier) };
  });

export const restaurantsNearby = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { lat: number; lng: number; radiusKm?: number }) =>
    z
      .object({
        lat: z.number(),
        lng: z.number(),
        radiusKm: z.number().min(0.5).max(20).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const r = data.radiusKm ?? 5;
    const latDelta = r / 111;
    const lngDelta = r / (111 * Math.cos((data.lat * Math.PI) / 180));
    const { data: rows } = await supabase
      .from("restaurants_nearby")
      .select("*")
      .gte("lat", data.lat - latDelta)
      .lte("lat", data.lat + latDelta)
      .gte("lng", data.lng - lngDelta)
      .lte("lng", data.lng + lngDelta)
      .limit(30);
    return { restaurants: rows ?? [] };
  });

export const convertCurrency = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { amount: number; from: string; to: string }) =>
    z.object({ amount: z.number(), from: z.string().length(3), to: z.string().length(3) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    if (data.from === data.to) return { converted: data.amount, rate: 1 };
    const { data: row } = await supabase
      .from("currency_rates")
      .select("rate, fetched_at")
      .eq("base", data.from)
      .eq("quote", data.to)
      .maybeSingle();
    const stale = !row || Date.now() - new Date(row.fetched_at).getTime() > 6 * 3600 * 1000;
    if (stale) {
      try {
        const res = await fetch(`https://open.er-api.com/v6/latest/${data.from}`);
        const j = await res.json();
        const rate = j.rates?.[data.to];
        if (rate) {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin.from("currency_rates").upsert(
            {
              base: data.from,
              quote: data.to,
              rate,
              fetched_at: new Date().toISOString(),
            },
            { onConflict: "base,quote" },
          );
          return { converted: data.amount * rate, rate };
        }
      } catch {}
    }
    const rate = row?.rate ?? 1;
    return { converted: data.amount * rate, rate };
  });

export const getSleepScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const since = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const { data } = await supabase
      .from("sleep_logs")
      .select("log_date, duration_hours, quality")
      .eq("user_id", userId)
      .gte("log_date", since)
      .order("log_date");
    const rows = (data ?? []).map((r) => ({
      date: r.log_date,
      score: Math.min(100, Math.round(((r.duration_hours ?? 0) / 8) * 60 + (r.quality ?? 3) * 8)),
    }));
    return { rows };
  });

export const getPublicProfileMeta = createServerFn({ method: "POST" })
  .inputValidator((d: { userId: string }) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: p } = await supabaseAdmin
      .from("profiles")
      .select("full_name, avatar_url, scan_streak_current, health_coins, public_profile")
      .eq("id", data.userId)
      .maybeSingle();
    if (!p?.public_profile) return { profile: null };
    return { profile: p };
  });