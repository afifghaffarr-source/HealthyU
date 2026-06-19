/**
 * Unit tests for the Hijri helpers.
 *
 * Strategy:
 *   - `humanizeCountdown` is pure (no time dependency) — test exhaustively.
 *   - `getRamadhanCountdown(now)` accepts an explicit `now` — deterministic.
 *   - `getHijriToday()` / `getHijriFormatted()` use real `new Date()` —
 *     we only assert structural validity (Hijri year > 1440, month 1-12,
 *     day 1-30, gregorian year matches) so the tests don't drift as the
 *     real date changes.
 */
import { describe, expect, it } from "vitest";
import {
  getHijriFormatted,
  getHijriToday,
  getRamadhanCountdown,
  humanizeCountdown,
  NEXT_RAMADHAN_1448_H,
} from "@/features/hijri/lib/hijri";

describe("getHijriToday (structural)", () => {
  it("returns valid Hijri date components", () => {
    const t = getHijriToday();
    expect(t.day).toBeGreaterThanOrEqual(1);
    expect(t.day).toBeLessThanOrEqual(30);
    expect(t.month).toBeGreaterThanOrEqual(1);
    expect(t.month).toBeLessThanOrEqual(12);
    expect(t.year).toBeGreaterThanOrEqual(1440);
    expect(t.year).toBeLessThanOrEqual(1500);
    expect(t.monthName.length).toBeGreaterThan(0);
  });

  it("uses 1-indexed months (Muharram=1, Ramadhan=9)", () => {
    const t = getHijriToday();
    // Sanity: month must NOT be 0 (which would mean we forgot the +1).
    expect(t.month).not.toBe(0);
  });
});

describe("getHijriFormatted (structural)", () => {
  it("includes the ' H' Hijri year suffix", () => {
    const f = getHijriFormatted();
    expect(f.hijri.endsWith(" H")).toBe(true);
    expect(f.dayName.length).toBeGreaterThan(0);
    expect(f.gregorian.length).toBeGreaterThan(0);
  });

  it("returns Indonesian month names (no 'i' literal prefix)", () => {
    const f = getHijriFormatted();
    // moment-hijri's `iMMMM` format should resolve to "Muharram" etc.,
    // NOT the literal token "iMMMM" or "iJuni".
    expect(f.hijri).not.toContain("iMMMM");
    expect(f.hijri).not.toContain("iJuni");
    expect(f.hijri).not.toContain("iJanuary");
  });
});

describe("getRamadhanCountdown (deterministic)", () => {
  it("returns positive days for dates before 2027-02-18", () => {
    const c = getRamadhanCountdown(new Date("2027-02-17T00:00:00+07:00"));
    expect(c.totalDays).toBeGreaterThanOrEqual(0);
    expect(c.isPast).toBe(false);
    expect(c.isToday).toBe(false);
    expect(c.label).toBe("Menuju Ramadhan 1448 H");
  });

  it("flags isToday for exactly the target date", () => {
    const c = getRamadhanCountdown(new Date("2027-02-18T00:00:00+07:00"));
    expect(c.isToday).toBe(true);
    expect(c.isPast).toBe(false);
    expect(c.humanized).toBe("Hari ini!");
  });

  it("flags isPast after the target date", () => {
    const c = getRamadhanCountdown(new Date("2027-02-19T00:00:00+07:00"));
    expect(c.isPast).toBe(true);
    expect(c.totalDays).toBeLessThan(0);
    expect(c.humanized).toBe("Sudah lewat");
  });

  it("computes ~244 days for 2026-06-19", () => {
    // 2026-06-19 → 2027-02-18 ≈ 244 days
    const c = getRamadhanCountdown(new Date("2026-06-19T00:00:00+07:00"));
    expect(c.days).toBeGreaterThanOrEqual(243);
    expect(c.days).toBeLessThanOrEqual(245);
  });

  it("exposes NEXT_RAMADHAN_1448_H anchored to 2027-02-18 (WIB)", () => {
    // NEXT_RAMADHAN_1448_H is set to 2027-02-18T00:00:00+07:00
    // → in UTC that's 2027-02-17T17:00:00Z.
    expect(NEXT_RAMADHAN_1448_H.toISOString().slice(0, 10)).toBe("2027-02-17");
  });
});

describe("humanizeCountdown (exhaustive edge cases)", () => {
  it("negative days → 'Sudah lewat'", () => {
    expect(humanizeCountdown(-5, true)).toBe("Sudah lewat");
  });
  it("today → 'Hari ini!'", () => {
    expect(humanizeCountdown(0, false, true)).toBe("Hari ini!");
  });
  it("1 day → '1 hari lagi'", () => {
    expect(humanizeCountdown(1)).toBe("1 hari lagi");
  });
  it("6 days → '6 hari lagi'", () => {
    expect(humanizeCountdown(6)).toBe("6 hari lagi");
  });
  it("14 days → '2 minggu lagi'", () => {
    expect(humanizeCountdown(14)).toBe("2 minggu lagi");
  });
  it("15 days → '2 minggu 1 hari lagi'", () => {
    expect(humanizeCountdown(15)).toBe("2 minggu 1 hari lagi");
  });
  it("30 days → '1 bulan lagi'", () => {
    expect(humanizeCountdown(30)).toBe("1 bulan lagi");
  });
  it("100 days → '3 bulan 1 minggu lagi'", () => {
    expect(humanizeCountdown(100)).toBe("3 bulan 1 minggu lagi");
  });
  it("244 days (realistic today→Ramadhan case) → '8 bulan lagi'", () => {
    expect(humanizeCountdown(244)).toBe("8 bulan lagi");
  });
  it("does not use em-dash (typography rule)", () => {
    const cases = [-5, 0, 1, 6, 15, 30, 100, 244];
    for (const d of cases) {
      const s = humanizeCountdown(d, d < 0, d === 0);
      expect(s).not.toContain("—");
    }
  });
});
