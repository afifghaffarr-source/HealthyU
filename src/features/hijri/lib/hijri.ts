/**
 * Hijri calendar helpers using moment-hijri (Umm al-Qura calculation).
 *
 * moment-hijri@3.0.0 must be imported BEFORE using these helpers —
 * importing the package monkey-patches moment with Hijri format tokens.
 *
 * Indonesian Hijri month names are registered at module load via
 * `moment.updateLocale("id", ...)` so `iMMMM` returns Bahasa Indonesia
 * (instead of moment-hijri's default Arabic / English names).
 */

// moment-hijri's types don't exist on DefinitelyTyped, and its `export =`
// pattern doesn't play well with `module: ESNext` + `moduleResolution: Bundler`.
// We import directly from moment-hijri (which IS the patched moment module —
// it re-exports `module.exports = factory(require("moment/moment"))`) so the
// Hijri getters/format tokens are guaranteed to be on the same instance.
// Type-wise we cast through a small wrapper interface covering only what we use.
import moment from "moment-hijri";

interface HiMoment {
  format(template: string): string;
  locale(locale: string): HiMoment;
  /** Hijri day of month (1-30). Method in moment-hijri@3 (call as iDate()). */
  iDate(): number;
  /** Hijri month (0-11, 0 = Muharram). Method in moment-hijri@3. */
  iMonth(): number;
  /** Hijri year (e.g. 1446). Method in moment-hijri@3. */
  iYear(): number;
}
interface MomentCallable {
  (inp?: string | Date | HiMoment): HiMoment;
  updateLocale(language: string, spec: Record<string, unknown>): unknown;
}
const m = moment as unknown as MomentCallable;

// Register Indonesian Hijri month names — moment-hijri v3 doesn't ship these.
m.updateLocale("id", {
  iMonths: [
    "Muharram",
    "Safar",
    "Rabiul Awal",
    "Rabiul Akhir",
    "Jumadil Awal",
    "Jumadil Akhir",
    "Rajab",
    "Sya'ban",
    "Ramadhan",
    "Syawal",
    "Dzulqaidah",
    "Dzulhijjah",
  ],
  iMonthsShort: [
    "Muh",
    "Saf",
    "RabA",
    "RabB",
    "JumA",
    "JumB",
    "Raj",
    "Syab",
    "Ram",
    "Syw",
    "Dqa",
    "Dhj",
  ],
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HijriDate {
  /** Hijri day of month (1-30). */
  day: number;
  /** Hijri month (1-12). 9 = Ramadhan. */
  month: number;
  /** Indonesian month name. */
  monthName: string;
  /** Hijri year (e.g. 1446). */
  year: number;
}

export interface FormattedHijri {
  /** "4 Muharram 1448 H" */
  hijri: string;
  /** "19 Juni 2026" */
  gregorian: string;
  /** "Jumat" */
  dayName: string;
}

export interface Countdown {
  /** Total days until target (can be negative if past). */
  totalDays: number;
  /** Clamped >= 0 for display. */
  days: number;
  /** Hours remaining until target (0 if past). */
  hours: number;
  /** Indonesian label, e.g. "Menuju Ramadhan 1448 H". */
  label: string;
  /** Indonesian humanized form, e.g. "8 bulan 1 minggu lagi". */
  humanized: string;
  isPast: boolean;
  isToday: boolean;
}

// ---------------------------------------------------------------------------
// Hijri today
// ---------------------------------------------------------------------------

/**
 * Get today's Hijri date components.
 * Uses moment-hijri's Umm al-Qura calculation. May be ±1 day off from
 * local moon sighting (which is how it works in the real world too).
 */
export function getHijriToday(): HijriDate {
  const t = m();
  return {
    day: t.iDate(),
    month: t.iMonth() + 1, // moment's iMonth is 0-indexed
    monthName: t.format("iMMMM"),
    year: t.iYear(),
  };
}

/**
 * Get a fully-formatted Hijri + Gregorian + weekday display object,
 * ready to drop into a UI without further formatting.
 */
export function getHijriFormatted(): FormattedHijri {
  const t = m().locale("id");
  return {
    hijri: `${t.iDate()} ${t.format("iMMMM")} ${t.iYear()} H`,
    gregorian: t.format("D MMMM YYYY"),
    dayName: t.format("dddd"),
  };
}

// ---------------------------------------------------------------------------
// Ramadhan 1448 H countdown
// ---------------------------------------------------------------------------

/**
 * Predicted 1 Ramadhan 1448 H (Indonesian time).
 *
 * Source: astronomical prediction for 2027 — most likely 17-18 Feb 2027
 * (actual date depends on Saudi moon sighting the evening before).
 * We use 18 Feb as a safe round-number target.
 *
 * Countdown is in DAYS at the user's local midnight — drift of ±1 day
 * vs the official sighting is acceptable and expected.
 */
export const NEXT_RAMADHAN_1448_H = new Date("2027-02-18T00:00:00+07:00");

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const RAMADHAN_LABEL = "Menuju Ramadhan 1448 H";

/**
 * Compute the countdown to 1 Ramadhan 1448 H.
 *
 * @param now - Override "now" for deterministic testing. Defaults to new Date().
 */
export function getRamadhanCountdown(now: Date = new Date()): Countdown {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const target = new Date(NEXT_RAMADHAN_1448_H);
  target.setHours(0, 0, 0, 0);

  const totalDays = Math.round((target.getTime() - today.getTime()) / MS_PER_DAY);
  const days = Math.max(0, totalDays);
  const isPast = totalDays < 0;
  const isToday = totalDays === 0;

  return {
    totalDays,
    days,
    hours: Math.max(0, Math.round((target.getTime() - now.getTime()) / (60 * 60 * 1000))),
    label: RAMADHAN_LABEL,
    humanized: humanizeCountdown(days, isPast, isToday),
    isPast,
    isToday,
  };
}

/**
 * Humanize a day count into a natural Indonesian phrase.
 *
 * Examples:
 *   humanizeCountdown(0, false, true) → "Hari ini!"
 *   humanizeCountdown(1, false, false) → "1 hari lagi"
 *   humanizeCountdown(15, false, false) → "2 minggu 1 hari lagi"
 *   humanizeCountdown(245, false, false) → "8 bulan 1 minggu lagi"
 */
export function humanizeCountdown(days: number, isPast = false, isToday = false): string {
  if (isPast) return "Sudah lewat";
  if (isToday) return "Hari ini!";

  if (days === 1) return "1 hari lagi";
  if (days < 7) return `${days} hari lagi`;

  if (days < 30) {
    const weeks = Math.floor(days / 7);
    const rem = days % 7;
    if (rem === 0) return `${weeks} minggu lagi`;
    return `${weeks} minggu ${rem} hari lagi`;
  }

  const months = Math.floor(days / 30);
  const remDays = days % 30;
  const weeks = Math.floor(remDays / 7);

  if (months >= 1 && weeks >= 1) return `${months} bulan ${weeks} minggu lagi`;
  if (months >= 1) return `${months} bulan lagi`;
  if (weeks >= 1) return `${weeks} minggu lagi`;
  return `${days} hari lagi`;
}

/**
 * Convenience helper that bundles the three formatted values most UIs need.
 * Lives in the lib (not the component file) so the component module can
 * remain pure-component-only — required for React Fast Refresh to work.
 */
export interface WidgetText {
  hijri: string;
  gregorian: string;
  dayName: string;
  countdown: Countdown;
  humanized: string;
}

export function formatHijriWidgetText(): WidgetText {
  const { hijri, gregorian, dayName } = getHijriFormatted();
  const countdown = getRamadhanCountdown();
  return {
    hijri,
    gregorian,
    dayName,
    countdown,
    humanized: humanizeCountdown(countdown.days, countdown.isPast, countdown.isToday),
  };
}
