import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logServerError } from "@/lib/logger.server";

// ===== Restaurants nearby (geo search) =====

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

// ===== Currency conversion with stale-rate fallback =====

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
      } catch (e) {
        // Currency rate refresh from open.er-api.com failed (network,
        // upstream outage, rate missing, etc.). Fall through to use the
        // stale cached rate. Logged for alerting on systemic upstream issues.
        logServerError("scanLocation.convertCurrency", e, {
          stage: "rate-refresh",
          from: data.from,
          to: data.to,
        });
      }
    }
    const rate = row?.rate ?? 1;
    return { converted: data.amount * rate, rate };
  });
