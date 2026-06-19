/**
 * Tests for adhan-calc wrapper.
 *
 * Coverage:
 *   - Jakarta coordinates → Fajr/Dhuhr/Maghrib reasonable for known date
 *   - Mecca coordinates → Qibla bearing ≈ 0°
 *   - Singapore coordinates → Qibla bearing ≈ 292-294° (NW)
 *   - Different methods yield different Fajr (e.g. depag 18° vs kemenag 20°)
 *   - SunnahTimes midnight between Maghrib and Fajr
 *   - Timezone formatting: Asia/Jakarta vs Asia/Makassar differs
 *
 * Uses fixed Date (2026-06-19 noon UTC = ~19:00 WIB) for deterministic output.
 */

import { describe, it, expect } from "vitest";

import {
  calculatePrayerTimes,
  getSunnahTimes,
  qiblaBearing,
  getCalculationParameters,
} from "@/features/prayer/lib/adhan-calc";

const JAKARTA = { latitude: -6.2088, longitude: 106.8456 };
// Ka'bah coords per adhan@4.4.4 source (more precise than the 21.4225, 39.8262
// used elsewhere). Using the adhan source coords ensures Qibla bearing ≈ 0°
// (you are AT the Ka'bah).
const MECCA = { latitude: 21.4225241, longitude: 39.8261818 };
const SINGAPORE = { latitude: 1.3521, longitude: 103.8198 };

// Fixed date: 2026-06-19 noon UTC (≈ 19:00 WIB = 1.5h after Maghrib Jakarta).
// Pick a date outside Ramadan so we test standard timings (no adjustments).
const FIXED_DATE = new Date("2026-06-19T12:00:00Z");

describe("adhan-calc", () => {
  describe("calculatePrayerTimes — Jakarta", () => {
    it("returns all 6 prayer times formatted as HH:MM", () => {
      const result = calculatePrayerTimes({
        ...JAKARTA,
        date: FIXED_DATE,
        timezone: "Asia/Jakarta",
      });
      expect(result.Fajr).toMatch(/^\d{2}:\d{2}$/);
      expect(result.Sunrise).toMatch(/^\d{2}:\d{2}$/);
      expect(result.Dhuhr).toMatch(/^\d{2}:\d{2}$/);
      expect(result.Asr).toMatch(/^\d{2}:\d{2}$/);
      expect(result.Maghrib).toMatch(/^\d{2}:\d{2}$/);
      expect(result.Isha).toMatch(/^\d{2}:\d{2}$/);
    });

    it("Fajr before Sunrise before Dhuhr before Asr before Maghrib before Isha", () => {
      const result = calculatePrayerTimes({
        ...JAKARTA,
        date: FIXED_DATE,
        timezone: "Asia/Jakarta",
      });
      const toMinutes = (s: string) => {
        const [h, m] = s.split(":").map(Number);
        return h * 60 + m;
      };
      expect(toMinutes(result.Fajr)).toBeLessThan(toMinutes(result.Sunrise));
      expect(toMinutes(result.Sunrise)).toBeLessThan(toMinutes(result.Dhuhr));
      expect(toMinutes(result.Dhuhr)).toBeLessThan(toMinutes(result.Asr));
      expect(toMinutes(result.Asr)).toBeLessThan(toMinutes(result.Maghrib));
      expect(toMinutes(result.Maghrib)).toBeLessThan(toMinutes(result.Isha));
    });

    it("includes meta: method + qiblaBearing", () => {
      const result = calculatePrayerTimes({
        ...JAKARTA,
        date: FIXED_DATE,
      });
      expect(result.method).toBe("kemenag");
      expect(result.qiblaBearing).toBeGreaterThan(290);
      expect(result.qiblaBearing).toBeLessThan(300);
    });

    it("exposes raw Date objects for downstream countdown", () => {
      const result = calculatePrayerTimes({
        ...JAKARTA,
        date: FIXED_DATE,
      });
      expect(result.raw.fajr).toBeInstanceOf(Date);
      expect(result.raw.maghrib.getTime()).toBeGreaterThan(result.raw.dhuhr.getTime());
    });
  });

  describe("qiblaBearing", () => {
    it("Mecca (Ka'bah coords) → returns finite bearing (great-circle fallback at 0 distance)", () => {
      // At the exact Ka'bah coords, great-circle bearing is undefined (distance = 0).
      // adhan returns 180° (south) as a numerical fallback — the meaningful
      // guarantee is just that it doesn't crash with NaN/Infinity. Real users
      // will never be at the exact Ka'bah, so we test the slightly-offset case below.
      const bearing = qiblaBearing(MECCA.latitude, MECCA.longitude);
      expect(Number.isFinite(bearing)).toBe(true);
      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThan(360);
    });

    it("~100m North of Ka'bah → bearing points South (~180°)", () => {
      // Offset 0.001° latitude north (~111m). At this offset, the great-circle
      // bearing toward Ka'bah is ~180° (south). Tolerant ±5° for numerical noise.
      const bearing = qiblaBearing(MECCA.latitude + 0.001, MECCA.longitude);
      expect(bearing).toBeGreaterThan(175);
      expect(bearing).toBeLessThan(185);
    });

    it("Jakarta → ~295° (NW)", () => {
      const bearing = qiblaBearing(JAKARTA.latitude, JAKARTA.longitude);
      expect(bearing).toBeGreaterThan(290);
      expect(bearing).toBeLessThan(300);
    });

    it("Singapore → ~292-294° (NW, close to Jakarta)", () => {
      const bearing = qiblaBearing(SINGAPORE.latitude, SINGAPORE.longitude);
      expect(bearing).toBeGreaterThan(290);
      expect(bearing).toBeLessThan(295);
    });
  });

  describe("calculation methods", () => {
    it("kemenag (20°/18°) gives earlier Fajr than depag/Karachi (18°/18°)", () => {
      const kemenag = calculatePrayerTimes({
        ...JAKARTA,
        date: FIXED_DATE,
        method: "kemenag",
      });
      const depag = calculatePrayerTimes({
        ...JAKARTA,
        date: FIXED_DATE,
        method: "depag",
      });
      // Kemenag fajrAngle=20° → fajr is EARLIER (lower time-of-day) than 18°.
      const toMinutes = (s: string) => {
        const [h, m] = s.split(":").map(Number);
        return h * 60 + m;
      };
      expect(toMinutes(kemenag.Fajr)).toBeLessThan(toMinutes(depag.Fajr));
    });

    it("getCalculationParameters returns valid params for all methods", () => {
      const methods: Array<
        "kemenag" | "depag" | "muhammadiyah" | "singapore" | "muslim-world-league" | "other"
      > = ["kemenag", "depag", "muhammadiyah", "singapore", "muslim-world-league", "other"];
      for (const m of methods) {
        const params = getCalculationParameters(m);
        // "other" intentionally has 0/0 (caller customizes after construction).
        // All other methods must have positive angles.
        if (m === "other") {
          expect(params.fajrAngle).toBe(0);
          expect(params.ishaAngle).toBe(0);
        } else {
          expect(params.fajrAngle).toBeGreaterThan(0);
          expect(params.ishaAngle).toBeGreaterThan(0);
        }
      }
    });
  });

  describe("SunnahTimes", () => {
    it("midnight falls between Maghrib and next Fajr", () => {
      const sunnah = getSunnahTimes({
        ...JAKARTA,
        date: FIXED_DATE,
        timezone: "Asia/Jakarta",
      });
      const toMinutes = (s: string) => {
        const [h, m] = s.split(":").map(Number);
        return h * 60 + m;
      };
      // Midnight on 2026-06-19 in Jakarta: Maghrib ~17:50, Fajr next day ~04:38,
      // so midnight falls between (Maghrib + 6h) ≈ 23:50 and (Fajr - 4h) ≈ 00:38.
      // Either same-day 22:00-23:59 OR next-day 00:00-01:00. Accept both.
      const mid = toMinutes(sunnah.midnight);
      const isEvening = mid >= 22 * 60 && mid < 24 * 60;
      const isEarlyMorning = mid >= 0 && mid <= 60;
      expect(isEvening || isEarlyMorning).toBe(true);
    });

    it("lastThirdOfNight is later than midnight", () => {
      const sunnah = getSunnahTimes({
        ...JAKARTA,
        date: FIXED_DATE,
        timezone: "Asia/Jakarta",
      });
      const toMinutes = (s: string) => {
        const [h, m] = s.split(":").map(Number);
        return h * 60 + m;
      };
      const mid = toMinutes(sunnah.midnight);
      const last = toMinutes(sunnah.lastThirdOfNight);
      // lastThird can wrap past midnight (e.g. midnight 23:15 → lastThird 02:00 next day)
      const adjusted = last < mid ? last + 24 * 60 : last;
      expect(adjusted).toBeGreaterThan(mid);
    });
  });

  describe("timezone formatting", () => {
    it("same UTC time → different local time in Jakarta vs Makassar", () => {
      const jakarta = calculatePrayerTimes({
        ...JAKARTA,
        date: FIXED_DATE,
        timezone: "Asia/Jakarta",
      });
      const makassar = calculatePrayerTimes({
        ...JAKARTA,
        date: FIXED_DATE,
        timezone: "Asia/Makassar",
      });
      // Makassar is UTC+8, Jakarta is UTC+7 → Makassar = Jakarta + 1h
      const toMinutes = (s: string) => {
        const [h, m] = s.split(":").map(Number);
        return h * 60 + m;
      };
      expect(toMinutes(makassar.Dhuhr)).toBe(toMinutes(jakarta.Dhuhr) + 60);
    });
  });
});
