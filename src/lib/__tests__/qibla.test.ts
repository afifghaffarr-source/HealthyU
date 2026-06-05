import { describe, it, expect } from "vitest";
import { qiblaBearing } from "@/features/prayer/lib/qibla";

describe("qiblaBearing", () => {
  it("returns a value in [0, 360)", () => {
    const b = qiblaBearing(-6.2, 106.8); // Jakarta
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThan(360);
  });

  it("Jakarta points roughly WNW (~290–300°)", () => {
    const b = qiblaBearing(-6.2, 106.8);
    expect(b).toBeGreaterThan(285);
    expect(b).toBeLessThan(305);
  });

  it("New York points roughly NE (~55–60°)", () => {
    const b = qiblaBearing(40.7128, -74.006);
    expect(b).toBeGreaterThan(50);
    expect(b).toBeLessThan(65);
  });

  it("London points roughly SE (~118–122°)", () => {
    const b = qiblaBearing(51.5074, -0.1278);
    expect(b).toBeGreaterThan(115);
    expect(b).toBeLessThan(125);
  });

  it("Mecca itself returns near-undefined direction but stays finite", () => {
    const b = qiblaBearing(21.4225, 39.8262);
    expect(Number.isFinite(b)).toBe(true);
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThan(360);
  });
});