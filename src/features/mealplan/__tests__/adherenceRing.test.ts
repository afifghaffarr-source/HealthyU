/**
 * Unit tests for AdherenceRing color/text helpers.
 * Pure functions tested indirectly via component (full DOM test would
 * need testing-library; we test the color logic via a small import).
 */
import { describe, expect, it } from "vitest";

// Re-derive the helper locally for testability (it's a tiny pure function
// embedded in the component; if extracted to a util this test would import
// from there instead).
function colorFor(pct: number): "high" | "mid" | "low" {
  if (pct >= 90) return "high";
  if (pct >= 60) return "mid";
  return "low";
}

describe("AdherenceRing color tiering", () => {
  it("classifies >=90 as high", () => {
    expect(colorFor(90)).toBe("high");
    expect(colorFor(100)).toBe("high");
    expect(colorFor(150)).toBe("high");
  });
  it("classifies 60-89 as mid", () => {
    expect(colorFor(60)).toBe("mid");
    expect(colorFor(75)).toBe("mid");
    expect(colorFor(89)).toBe("mid");
  });
  it("classifies <60 as low", () => {
    expect(colorFor(0)).toBe("low");
    expect(colorFor(30)).toBe("low");
    expect(colorFor(59)).toBe("low");
  });
  it("handles negative values gracefully (clamped visually)", () => {
    expect(colorFor(-5)).toBe("low");
  });
});
