/**
 * Sprint 26 — Smart Cheat Day Guard (anti-restrictive cycle detector).
 *
 * Why: Most diet-psychology literature points to a vicious cycle:
 *   restrictive deficit (skipping/low-cal days) → metabolic/hormonal
 *   compensation + craving rebound → overeat surge. Fighting the surge
 *   with more restriction deepens the cycle.
 *
 *   HealthyU's stance (humane, non-shaming already-locked in Sprint 25):
 *   when this cycle is detected, the right action is to SCHEDULE cheat
 *   days intentionally, not to punish.
 *
 * ponytail:
 * - Reuses existing meta-pattern registry + date-intersection helper
 * - Components are existing single-pattern detectors (`busy_day_skips`,
 *   `celebration_overeat`). No new single-pattern rule file.
 * - 0 new tables, 0 cron (piggybacks on pattern-detection cron).
 * - 0 AI cost (pure rule-based overlap).
 *
 * Clinical-response copy is DEFERRED to psychologist sign-off (same
 * pattern as Sprint 25 ED-disclosure). The meta-pattern fire itself is
 * engineering-only — QUIETER nudge via existing MetaPatternHeroCard.
 */

import { describe, it, expect } from "vitest";
import { detectMetaPatterns, META_PATTERN_REGISTRY } from "../metaPatterns.server";
import type { DetectedPattern } from "../../types/pattern";

describe("Sprint 26: Smart Cheat Day Guard — restrictive_cheat_cycle", () => {
  it("is registered in META_PATTERN_REGISTRY", () => {
    const entry = META_PATTERN_REGISTRY.find((m) => m.id === "restrictive_cheat_cycle");
    expect(entry).toBeDefined();
    expect(entry!.components.sort()).toEqual(["busy_day_skips", "celebration_overeat"]);
    expect(entry!.minOverlapDays).toBeGreaterThanOrEqual(1);
  });

  it("fires when busy_day_skips + celebration_overeat co-occur on 2+ days", () => {
    const patterns: DetectedPattern[] = [
      {
        type: "busy_day_skips",
        count: 3,
        detected: true,
        matched_dates: ["2026-06-01", "2026-06-02", "2026-06-05"],
        metadata: {},
      },
      {
        type: "celebration_overeat",
        count: 2,
        detected: true,
        matched_dates: ["2026-06-02", "2026-06-05", "2026-06-10"],
        metadata: {},
      },
    ];
    const out = detectMetaPatterns(patterns);
    const meta = out.find((m) => m.metapattern_id === "restrictive_cheat_cycle");
    expect(meta).toBeDefined();
    expect(meta!.matched_dates.sort()).toEqual(["2026-06-02", "2026-06-05"]);
    expect(meta!.components.sort()).toEqual(["busy_day_skips", "celebration_overeat"]);
    expect(meta!.type).toBe("meta_pattern");
    expect(meta!.detected).toBe(true);
  });

  it("does NOT fire when only one component present", () => {
    const patterns: DetectedPattern[] = [
      {
        type: "busy_day_skips",
        count: 5,
        detected: true,
        matched_dates: ["2026-06-01", "2026-06-02", "2026-06-03"],
        metadata: {},
      },
    ];
    const out = detectMetaPatterns(patterns);
    expect(out.find((m) => m.metapattern_id === "restrictive_cheat_cycle")).toBeUndefined();
  });

  it("does NOT fire when components have no date overlap", () => {
    const patterns: DetectedPattern[] = [
      {
        type: "busy_day_skips",
        count: 3,
        detected: true,
        matched_dates: ["2026-06-01", "2026-06-02"],
        metadata: {},
      },
      {
        type: "celebration_overeat",
        count: 2,
        detected: true,
        matched_dates: ["2026-06-09", "2026-06-10"],
        metadata: {},
      },
    ];
    const out = detectMetaPatterns(patterns);
    expect(out.find((m) => m.metapattern_id === "restrictive_cheat_cycle")).toBeUndefined();
  });

  it("does NOT fire when either component flagged detected=false", () => {
    const patterns: DetectedPattern[] = [
      {
        type: "busy_day_skips",
        count: 5,
        detected: true,
        matched_dates: ["2026-06-01", "2026-06-02"],
        metadata: {},
      },
      {
        type: "celebration_overeat",
        // below threshold → detected:false in engine
        count: 0,
        detected: false,
        matched_dates: ["2026-06-01", "2026-06-02"],
        metadata: {},
      },
    ];
    const out = detectMetaPatterns(patterns);
    expect(out.find((m) => m.metapattern_id === "restrictive_cheat_cycle")).toBeUndefined();
  });

  it("registry includes restrictive_cheat_cycle alongside the existing 3", () => {
    const ids = META_PATTERN_REGISTRY.map((m) => m.id).sort();
    expect(ids).toContain("restrictive_cheat_cycle");
    expect(ids).toContain("stress_late_night_combo");
    expect(ids).toContain("weekend_indulgence_combo");
    expect(ids).toContain("emotional_mood_cycle");
    expect(META_PATTERN_REGISTRY.length).toBe(4);
  });
});
