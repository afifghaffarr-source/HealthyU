/**
 * Meta-Pattern Detection Test
 * Sprint 12 — overlap logic + dedup
 */

import { describe, it, expect } from "vitest";
import { detectMetaPatterns, META_PATTERN_REGISTRY } from "../metaPatterns.server";
import type { DetectedPattern } from "../../types/pattern";

describe("detectMetaPatterns", () => {
  it("returns empty when no patterns detected", () => {
    const out = detectMetaPatterns([]);
    expect(out).toEqual([]);
  });

  it("doesn't fire when both components present but no date overlap", () => {
    const patterns: DetectedPattern[] = [
      {
        type: "stress_eating",
        count: 3,
        detected: true,
        matched_dates: ["2026-06-01", "2026-06-02"],
        metadata: {},
      },
      {
        type: "late_night_eating",
        count: 3,
        detected: true,
        matched_dates: ["2026-06-10", "2026-06-11"],
        metadata: {},
      },
    ];
    const out = detectMetaPatterns(patterns);
    expect(out.find((m) => m.metapattern_id === "stress_late_night_combo")).toBeUndefined();
  });

  it("fires stress_late_night_combo when 2+ overlapping days present", () => {
    const patterns: DetectedPattern[] = [
      {
        type: "stress_eating",
        count: 3,
        detected: true,
        matched_dates: ["2026-06-01", "2026-06-02", "2026-06-05"],
        metadata: {},
      },
      {
        type: "late_night_eating",
        count: 4,
        detected: true,
        matched_dates: ["2026-06-01", "2026-06-02", "2026-06-10"],
        metadata: {},
      },
    ];
    const out = detectMetaPatterns(patterns);
    const meta = out.find((m) => m.metapattern_id === "stress_late_night_combo");
    expect(meta).toBeDefined();
    expect(meta!.matched_dates.sort()).toEqual(["2026-06-01", "2026-06-02"]);
    expect(meta!.components.sort()).toEqual(["late_night_eating", "stress_eating"]);
    expect(meta!.count).toBe(2);
  });

  it("does NOT fire when only one component present", () => {
    const patterns: DetectedPattern[] = [
      {
        type: "stress_eating",
        count: 5,
        detected: true,
        matched_dates: ["2026-06-01", "2026-06-02"],
        metadata: {},
      },
    ];
    const out = detectMetaPatterns(patterns);
    expect(out.find((m) => m.metapattern_id === "stress_late_night_combo")).toBeUndefined();
  });

  it("does NOT fire if any component flagged detected=false", () => {
    const patterns: DetectedPattern[] = [
      {
        type: "stress_eating",
        count: 5,
        detected: true,
        matched_dates: ["2026-06-01", "2026-06-02"],
        metadata: {},
      },
      {
        type: "late_night_eating",
        count: 1, // below threshold → detected:false in engine
        detected: false,
        matched_dates: ["2026-06-01", "2026-06-02"],
        metadata: {},
      },
    ];
    const out = detectMetaPatterns(patterns);
    expect(out.find((m) => m.metapattern_id === "stress_late_night_combo")).toBeUndefined();
  });

  it("fires emotional_mood_cycle for stress+mood overlap", () => {
    const patterns: DetectedPattern[] = [
      {
        type: "stress_eating",
        count: 3,
        detected: true,
        matched_dates: ["2026-06-03", "2026-06-04", "2026-06-07"],
        metadata: {},
      },
      {
        type: "mood_binges",
        count: 3,
        detected: true,
        matched_dates: ["2026-06-04", "2026-06-05", "2026-06-07"],
        metadata: {},
      },
    ];
    const out = detectMetaPatterns(patterns);
    const meta = out.find((m) => m.metapattern_id === "emotional_mood_cycle");
    expect(meta).toBeDefined();
    expect(meta!.matched_dates.sort()).toEqual(["2026-06-04", "2026-06-07"]);
  });

  it("registry size matches design (3 metapatterns initially)", () => {
    expect(META_PATTERN_REGISTRY.length).toBe(3);
  });
});
