import { describe, it, expect } from "vitest";
import { computeNextStep } from "@/features/dashboard/lib/computeNextStep";

const baseInput = {
  hour: 8,
  mealCount: 0,
  waterMl: 0,
  waterTarget: 2000,
  fastActive: false,
  remainingKcal: 1500,
};

describe("computeNextStep", () => {
  it("suggests water during fast when hydration is very low", () => {
    const step = computeNextStep({ ...baseInput, fastActive: true, waterMl: 500 });
    expect(step.to).toBe("/water");
    expect(step.label).toMatch(/air/i);
  });

  it("suggests breakfast at 7-11 with no meals", () => {
    const step = computeNextStep({ ...baseInput, hour: 8, mealCount: 0 });
    expect(step.to).toBe("/scan");
    expect(step.label).toMatch(/sarapan/i);
  });

  it("suggests lunch at 11-15 with fewer than 2 meals", () => {
    const step = computeNextStep({ ...baseInput, hour: 12, mealCount: 1 });
    expect(step.to).toBe("/scan");
    expect(step.label).toMatch(/makan siang/i);
  });

  it("suggests dinner at 17-21 with remaining kcal > 300", () => {
    const step = computeNextStep({ ...baseInput, hour: 18, mealCount: 2, remainingKcal: 500 });
    expect(step.to).toBe("/scan");
    expect(step.label).toMatch(/makan malam/i);
  });

  it("falls back to water at 50% hydration target", () => {
    const step = computeNextStep({ ...baseInput, hour: 14, mealCount: 2, waterMl: 800 });
    expect(step.to).toBe("/water");
  });

  it("suggests sleep prep after 21:00", () => {
    const step = computeNextStep({
      ...baseInput,
      hour: 22,
      mealCount: 3,
      waterMl: 1500,
      remainingKcal: 100,
    });
    expect(step.to).toBe("/sleep");
  });

  it("falls back to recommendations when nothing else applies", () => {
    const step = computeNextStep({
      ...baseInput,
      hour: 14,
      mealCount: 3,
      waterMl: 2000,
      remainingKcal: 100,
    });
    expect(step.to).toBe("/recommendations");
  });
});
