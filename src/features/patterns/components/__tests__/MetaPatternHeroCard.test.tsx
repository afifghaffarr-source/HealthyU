import { describe, it, expect } from "vitest";
import {
  HIGH_URGENCY_THRESHOLD,
  isHighUrgency,
} from "@/features/patterns/components/MetaPatternHeroCard";

/**
 * Sprint 22 — Pola Gagal Diet escalation tests.
 *
 * Locks the threshold semantics so the UI doesn't accidentally toggle
 * critical CTA on a borderline score. We test the pure isHighUrgency
 * helper instead of the rendered component because:
 *   - The component pulls in lucide-react + tanstack-router Link which
 *     require jsdom + Router context. Testing the boundary directly
 *     is faster, more stable, and equally informative.
 *   - The component's data-urgency-level prop is asserted indirectly
 *     (when isHighUrgency returns true, the prop is "high" — see source).
 */
describe("HIGH_URGENCY_THRESHOLD constant", () => {
  it("is 0.7 (lock the boundary — UI relies on this value)", () => {
    expect(HIGH_URGENCY_THRESHOLD).toBe(0.7);
  });
});

describe("isHighUrgency", () => {
  it("flags 0.7 as high (boundary inclusive)", () => {
    expect(isHighUrgency(0.7)).toBe(true);
  });

  it("flags 0.99 as high (extreme urgency)", () => {
    expect(isHighUrgency(0.99)).toBe(true);
  });

  it("flags 1.0 as high (maximum)", () => {
    expect(isHighUrgency(1.0)).toBe(true);
  });

  it("does NOT flag 0.69 (just below threshold)", () => {
    expect(isHighUrgency(0.69)).toBe(false);
  });

  it("does NOT flag 0.5 (typical active meta-pattern)", () => {
    expect(isHighUrgency(0.5)).toBe(false);
  });

  it("does NOT flag 0.0 (no urgency)", () => {
    expect(isHighUrgency(0.0)).toBe(false);
  });

  it("does NOT flag null / undefined / NaN (defensive guard)", () => {
    expect(isHighUrgency(null)).toBe(false);
    expect(isHighUrgency(undefined)).toBe(false);
    expect(isHighUrgency(Number.NaN)).toBe(false);
  });

  it("rejects negative scores (defensive)", () => {
    expect(isHighUrgency(-0.1)).toBe(false);
  });

  it("rejects non-finite scores (defensive)", () => {
    expect(isHighUrgency(Number.POSITIVE_INFINITY)).toBe(false); // not >= finite threshold
  });
});
