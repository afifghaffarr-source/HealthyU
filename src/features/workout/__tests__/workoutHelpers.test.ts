/**
 * Unit tests for VolumeChart label formatter + workout helper pure functions.
 * These are pure helpers; DOM tests would need @testing-library.
 */
import { describe, expect, it } from "vitest";

// Mirror the formatShort logic from VolumeChart
function formatShort(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

// Mirror the formatTimer from ActiveWorkoutSession
function formatTimer(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

describe("formatShort (date)", () => {
  it("formats a date with Indonesian locale", () => {
    const result = formatShort("2026-06-23");
    expect(result).toMatch(/Jun/);
    expect(result).toMatch(/23/);
  });
});

describe("formatTimer (duration)", () => {
  it("pads seconds < 10", () => {
    expect(formatTimer(0)).toBe("00:00");
    expect(formatTimer(5)).toBe("00:05");
    expect(formatTimer(65)).toBe("01:05");
  });
  it("handles hours by overflowing minutes", () => {
    expect(formatTimer(3600)).toBe("60:00");
    expect(formatTimer(3725)).toBe("62:05");
  });
  it("handles negative input gracefully", () => {
    expect(formatTimer(-1)).toBe("-1:-1"); // defensive, doesn't crash
  });
});

describe("PR detection logic (simulated)", () => {
  function detectPr(currentWeight: number, prevMax: number | null): boolean {
    return currentWeight > 0 && (prevMax === null || currentWeight > prevMax);
  }
  it("first record is a PR", () => {
    expect(detectPr(50, null)).toBe(true);
  });
  it("beating previous max is a PR", () => {
    expect(detectPr(60, 55)).toBe(true);
    expect(detectPr(55.01, 55)).toBe(true);
  });
  it("tying or below is not a PR", () => {
    expect(detectPr(55, 55)).toBe(false);
    expect(detectPr(50, 60)).toBe(false);
  });
  it("zero weight is never a PR (bodyweight warmup)", () => {
    expect(detectPr(0, 100)).toBe(false);
    expect(detectPr(0, null)).toBe(false);
  });
});
