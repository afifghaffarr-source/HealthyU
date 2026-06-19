/**
 * Server function: get prayer times for a coordinate + date.
 *
 * Sprint 1b: migrated from aladhan.com HTTP API → local adhan@4.4.4 (MIT).
 * BENEFITS:
 *   - Offline-capable (no network roundtrip)
 *   - Lower latency (~5 ms vs ~200 ms HTTP)
 *   - No aladhan.com rate limit
 *   - No data leaves server (privacy +)
 *
 * Backward-compatible API: still returns `{ ok, timings: {Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha} }`
 * so callers (e.g. src/routes/_authenticated/prayer.aladhan.tsx) work unchanged.
 *
 * Note: file path kept as `prayerTimes.functions.ts` (not renamed) to avoid
 * changing the import path in existing callers.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  calculatePrayerTimes,
  DEFAULT_TIMEZONE,
  type CalculationMethodId,
} from "@/features/prayer/lib/adhan-calc";

const InputSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  method: z
    .enum(["kemenag", "depag", "muhammadiyah", "singapore", "muslim-world-league", "other"])
    .optional(),
  timezone: z.string().optional(),
  // ISO date string (YYYY-MM-DD). Optional, defaults to today (server local).
  date: z.string().optional(),
});

export const getPrayerTimes = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => InputSchema.parse(i))
  .handler(async ({ data }) => {
    try {
      const result = calculatePrayerTimes({
        latitude: data.lat,
        longitude: data.lng,
        date: data.date ? new Date(data.date) : new Date(),
        method: (data.method as CalculationMethodId | undefined) ?? "kemenag",
        timezone: data.timezone ?? DEFAULT_TIMEZONE,
      });
      return {
        ok: true as const,
        timings: {
          Fajr: result.Fajr,
          Sunrise: result.Sunrise,
          Dhuhr: result.Dhuhr,
          Asr: result.Asr,
          Maghrib: result.Maghrib,
          Isha: result.Isha,
        },
        meta: {
          method: result.method,
          qiblaBearing: result.qiblaBearing,
        },
      };
    } catch (e) {
      return {
        ok: false as const,
        error: e instanceof Error ? e.message : "calculation failed",
      };
    }
  });
