import { describe, it, expect } from "vitest";
import {
  computeIftarCountdown,
  computeSahurCountdown,
  pickSafeFastingNudge,
  type PuasaAmanContext,
} from "@/features/fasting/lib/puasaAman";

/**
 * Sprint 29 — Puasa Aman Mode (buka-puasa countdown + safe-fasting nudge).
 *
 * Pure helper; the only wall-clock input is `now`. Server fn injects it.
 * Locks the deterministic time-arithmetic + Indonesian nudge copy that
 * are the whole UX of the countdown widget.
 */

const base: PuasaAmanContext = {
  nowIso: "2025-03-15T10:00:00Z", // ~10:00 UTC, mid-Ramadhan simulation
  hour24: 10,
  iftarHhmm: "18:15",
  imsakHhmm: "04:30",
  activeFast: true,
  elapsedHours: 6.5,
  targetHours: 14,
  lastWaterLogHoursAgo: 1.5,
  lastMealHoursAgo: 13,
  hoursActiveConsecutiveDays: 0,
  inRamadhanMode: true,
};

describe("computeIftarCountdown — buka-puasa", () => {
  it("returns hours+minutes remaining and a friendly Indonesian label when iftar is later today", () => {
    const c = computeIftarCountdown(base);
    expect(c.minutesUntil).toBeGreaterThan(0);
    expect(c.label.length).toBeGreaterThan(0);
    expect(c.label.toLowerCase()).toContain("berbuka");
    expect(c.label.length).toBeLessThan(50);
  });

  it("treats elapsed past iftar as 'berbuka sekarang' (0 minutes)", () => {
    const pastIftar = computeIftarCountdown({
      ...base,
      hour24: 19, // already past 18:15 iftar
    });
    expect(pastIftar.minutesUntil).toBe(0);
    expect(pastIftar.label.toLowerCase()).toContain("sekarang");
  });

  it("clamps impossibly large gaps to 24h max (one day)", () => {
    const longGap = computeIftarCountdown({
      ...base,
      hour24: 23,
      iftarHhmm: "18:15",
    });
    expect(longGap.minutesUntil).toBeLessThanOrEqual(24 * 60);
  });

  it("returns 0 minutes when fast is not active (no countdown)", () => {
    const r = computeIftarCountdown({ ...base, activeFast: false });
    expect(r.minutesUntil).toBe(0);
    expect(r.label.toLowerCase()).toMatch(/tidak|belum/);
  });
});

describe("computeSahurCountdown — sahur reverse (pre-iftar only)", () => {
  it("returns positive minutes-to-imsak when before sahur window", () => {
    const r = computeSahurCountdown({ ...base, hour24: 3 });
    expect(r.minutesUntil).toBeGreaterThan(0);
    expect(r.label.toLowerCase()).toMatch(/imsak|sahur/);
  });

  it("returns 0 minutes when already past imsak (post-dawn)", () => {
    const r = computeSahurCountdown({ ...base, hour24: 8 });
    expect(r.minutesUntil).toBe(0);
    expect(r.label.toLowerCase()).toMatch(/lewat|selesai/);
  });

  it("handles invalid 'HH:mm' gracefully without crashing", () => {
    const r = computeSahurCountdown({ ...base, imsakHhmm: "bad" });
    expect(r.minutesUntil).toBe(0);
  });
});

describe("pickSafeFastingNudge — humane, never shame-language", () => {
  it("drink water nudge when more than 2 hours since last water log", () => {
    const n = pickSafeFastingNudge({ ...base, lastWaterLogHoursAgo: 3 });
    expect(n.kind).toBe("water");
    expect(n.copy.length).toBeGreaterThan(0);
  });

  it("jamak kalau h-iftar → cahaya / buka-puasa prep nudge", () => {
    const n = pickSafeFastingNudge({ ...base, hour24: 17.75 });
    expect(n.kind).toBe("iftar-prep");
  });

  it("siang hari → dukungan nudge, NOT shaming", () => {
    const n = pickSafeFastingNudge({ ...base, hour24: 14, elapsedHours: 8 });
    expect(n.kind).toBe("midday-support");
    // Sprint 25 humane-tone lock: NEVER use "kamu gagal", "jelek", "gagal"
    expect(n.copy.toLowerCase()).not.toMatch(/gagal|jelek|buruk/);
  });

  it("dehydration guard nudge when more than 5 hours since water", () => {
    const n = pickSafeFastingNudge({ ...base, lastWaterLogHoursAgo: 7 });
    expect(n.kind).toBe("water");
    expect(n.priority).toBeGreaterThanOrEqual(2);
  });

  it("returns a Ramadhān-flavoured copy when inRamadhanMode", () => {
    const n = pickSafeFastingNudge({ ...base, inRamadhanMode: true, hour24: 17.5 });
    expect(n.copy.toLowerCase()).toMatch(/berbuka|ramadhan/);
  });

  it("returns a non-Ramadhan copy otherwise", () => {
    const n = pickSafeFastingNudge({ ...base, inRamadhanMode: false, hour24: 17.5 });
    expect(n.copy.toLowerCase()).not.toMatch(/ramadhan/);
  });

  it("never returns null — always returns SOMETHING positive", () => {
    const n = pickSafeFastingNudge({ ...base, activeFast: false });
    expect(n).not.toBeNull();
    expect(n.copy.length).toBeGreaterThan(0);
  });

  it("human-tone: copy NEVER contains shame words", () => {
    const SHAME = ["gagal", "jelek", "buruk", "malas", "lemah"];
    for (let h = 5; h < 22; h++) {
      const n = pickSafeFastingNudge({ ...base, hour24: h });
      const lower = n.copy.toLowerCase();
      for (const w of SHAME) expect(lower).not.toContain(w);
    }
  });

  it("respects priority: highest priority wins (1=default, 2=urgent)", () => {
    const lowPriority = pickSafeFastingNudge({ ...base, hour24: 14, lastWaterLogHoursAgo: 1 });
    const highPriority = pickSafeFastingNudge({
      ...base,
      hour24: 14,
      lastWaterLogHoursAgo: 7,
    });
    expect(highPriority.priority).toBeGreaterThanOrEqual(lowPriority.priority);
  });
});

describe("end-to-end shape — sprint 29 widget payload", () => {
  it("produces a stable widget object (idempotent)", () => {
    const a = pickSafeFastingNudge(base);
    const b = pickSafeFastingNudge(base);
    expect(a).toEqual(b);
  });
});
