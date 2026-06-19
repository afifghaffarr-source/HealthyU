/**
 * Adhan.js wrapper — offline-capable prayer time calculation.
 *
 * Sprint 1b: replaces the previous aladhan.com API call (which required
 * internet) with local astronomical computation via adhan@4.4.4 (MIT,
 * Jean Meeus algorithms). See docs/HEALTHYU_MASTER_REKOMENDASI_REPO_2026-06-19.md.
 *
 * Calculation methods supported:
 *   - "kemenag"   → CalculationMethod.Other() with fajrAngle=20, ishaAngle=18
 *                   (Sihat/MABIMS standard used by Indonesia, Malaysia,
 *                   Singapura, Brunei — recommended default).
 *   - "depag"     → CalculationMethod.Karachi() (fajr=18, isha=18)
 *                   (Kementerian Agama RI older standard; preferred by NU).
 *   - "muhammadiyah" → CalculationMethod.MoonsightingCommittee() with
 *                      fajrAngle=20, ishaAngle=18 (Muhammadiyah uses hisab
 *                      hakiki wujudul hilal, closest match).
 *   - "default"   → Singapore (fajr=20, isha=18, dhuhr+1 min, rounding up).
 *
 * Timezone handling:
 *   - adhan-js returns UTC Date objects.
 *   - We format in the requested IANA timezone (Asia/Jakarta, Asia/Makassar,
 *     Asia/Jayapura) using Intl.DateTimeFormat with explicit timeZone option
 *     (browser-native, no extra dependency).
 *
 * Qibla:
 *   - Use adhan.Qibla(coordinates) for accurate great-circle bearing.
 *   - Returns degrees clockwise from true north (0-360).
 *
 * SunnahTimes:
 *   - nightMiddle()  → halfway between Maghrib and Fajr (tahajjud recommended)
 *   - lastThirdOfNight() → last 1/3 of night (最适合 qiyamul lail)
 */

import {
  Coordinates,
  CalculationMethod,
  CalculationParameters,
  PrayerTimes,
  Qibla,
  SunnahTimes,
  Madhab,
} from "adhan";

export type CalculationMethodId =
  | "kemenag"
  | "depag"
  | "muhammadiyah"
  | "singapore"
  | "muslim-world-league"
  | "other";

export interface PrayerTimesResult {
  /** ISO time string in requested timezone (HH:MM format). */
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Sunset: string; // optional, used by Sunnah calc
  Maghrib: string;
  Isha: string;
}

export interface PrayerTimesWithMeta extends PrayerTimesResult {
  /** Date objects (UTC) for downstream computations (countdown, etc). */
  raw: {
    fajr: Date;
    sunrise: Date;
    dhuhr: Date;
    asr: Date;
    sunset: Date;
    maghrib: Date;
    isha: Date;
  };
  /** Calculation method used. */
  method: CalculationMethodId;
  /** Qibla bearing in degrees clockwise from true north (0-360). */
  qiblaBearing: number;
}

/** Default Indonesia timezone. Override per-user via settings. */
export const DEFAULT_TIMEZONE = "Asia/Jakarta";

/**
 * Get CalculationParameters for the requested method.
 * adhan@4.4.4 does NOT have a built-in "Kemenag" preset, so we synthesize it
 * via CalculationParameters constructor with the angles used by Sihat/MABIMS.
 */
export function getCalculationParameters(
  method: CalculationMethodId = "kemenag",
): CalculationParameters {
  switch (method) {
    case "kemenag":
    case "muhammadiyah": {
      // Sihat/MABIMS (Standar Hisab Arah Kiblat Malaysia-Singapura-Brunei-Indonesia)
      // Fajr 20°, Isha 18°. Used by Muhammadiyah + most of modern Indonesia.
      const params = new CalculationParameters(null, 20, 18);
      params.methodAdjustments.dhuhr = 1;
      params.madhab = Madhab.Shafi; // default Indonesia (NU juga pakai Syafii)
      return params;
    }
    case "depag": {
      // Older Depag RI standard: Fajr 18°, Isha 18°. Preferred by some NU circles.
      return CalculationMethod.Karachi();
    }
    case "singapore":
      return CalculationMethod.Singapore();
    case "muslim-world-league":
      return CalculationMethod.MuslimWorldLeague();
    case "other":
    default:
      return CalculationMethod.Other();
  }
}

/** Format a UTC Date as "HH:MM" in the given IANA timezone.
 *
 * Implementation note: Intl.DateTimeFormat with `id-ID` locale outputs
 * "04.37" (period separator) instead of "04:37" (colon). For consistent
 * downstream parsing we always use `en-GB` which uses the colon separator
 * we need, while still resolving the user's timezone correctly via the
 * `timeZone` option.
 */
function formatTimeInTz(date: Date, timezone: string): string {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return fmt.format(date);
}

/**
 * Calculate prayer times for a single date + coordinate.
 * Offline-capable — no network call.
 */
export function calculatePrayerTimes(args: {
  latitude: number;
  longitude: number;
  date?: Date;
  method?: CalculationMethodId;
  timezone?: string;
}): PrayerTimesWithMeta {
  const {
    latitude,
    longitude,
    date = new Date(),
    method = "kemenag",
    timezone = DEFAULT_TIMEZONE,
  } = args;

  const coordinates = new Coordinates(latitude, longitude);
  const params = getCalculationParameters(method);
  const pt = new PrayerTimes(coordinates, date, params);

  return {
    Fajr: formatTimeInTz(pt.fajr, timezone),
    Sunrise: formatTimeInTz(pt.sunrise, timezone),
    Dhuhr: formatTimeInTz(pt.dhuhr, timezone),
    Asr: formatTimeInTz(pt.asr, timezone),
    Sunset: formatTimeInTz(pt.sunset, timezone),
    Maghrib: formatTimeInTz(pt.maghrib, timezone),
    Isha: formatTimeInTz(pt.isha, timezone),
    raw: {
      fajr: pt.fajr,
      sunrise: pt.sunrise,
      dhuhr: pt.dhuhr,
      asr: pt.asr,
      sunset: pt.sunset,
      maghrib: pt.maghrib,
      isha: pt.isha,
    },
    method,
    qiblaBearing: qiblaBearing(latitude, longitude),
  };
}

/**
 * Get Qibla bearing (degrees clockwise from true north, 0-360).
 * Uses adhan's precise great-circle formula (Vincenty/Karney-style).
 */
export function qiblaBearing(latitude: number, longitude: number): number {
  return Qibla(new Coordinates(latitude, longitude));
}

/**
 * Get Sunnah times for the same date/location.
 * - nightMiddle: best time for Tahajjud
 * - lastThirdOfNight: best time for Qiyamul Lail
 */
export function getSunnahTimes(args: {
  latitude: number;
  longitude: number;
  date?: Date;
  method?: CalculationMethodId;
  timezone?: string;
}): {
  midnight: string;
  lastThirdOfNight: string;
} {
  const {
    latitude,
    longitude,
    date = new Date(),
    method = "kemenag",
    timezone = DEFAULT_TIMEZONE,
  } = args;

  const coordinates = new Coordinates(latitude, longitude);
  const params = getCalculationParameters(method);
  const pt = new PrayerTimes(coordinates, date, params);
  const sunnah = new SunnahTimes(pt);

  return {
    midnight: formatTimeInTz(sunnah.middleOfTheNight, timezone),
    lastThirdOfNight: formatTimeInTz(sunnah.lastThirdOfTheNight, timezone),
  };
}
