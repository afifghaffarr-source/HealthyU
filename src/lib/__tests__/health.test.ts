import { describe, it, expect } from "vitest";
import {
  calcAge,
  calcBMI,
  bmiCategory,
  calcBMR,
  calcTDEE,
  fastingStage,
  formatDuration,
  todayRange,
  FASTING_PROTOCOLS,
} from "../health";

describe("calcAge", () => {
  it("defaults to 30 when null", () => {
    expect(calcAge(null)).toBe(30);
  });
  it("computes years from past date", () => {
    const dob = new Date(Date.now() - 25 * 365.25 * 24 * 3600 * 1000).toISOString();
    expect(calcAge(dob)).toBe(25);
  });
});

describe("calcBMI + bmiCategory", () => {
  it("BMI to one decimal", () => {
    expect(calcBMI(70, 175)).toBeCloseTo(22.9, 1);
  });
  it("categorises bands", () => {
    expect(bmiCategory(17).label).toBe("Underweight");
    expect(bmiCategory(22).label).toBe("Normal");
    expect(bmiCategory(27).label).toBe("Overweight");
    expect(bmiCategory(35).label).toBe("Obese");
  });
});

describe("calcBMR / calcTDEE (Mifflin-St Jeor)", () => {
  it("male formula adds +5", () => {
    // 10*70 + 6.25*175 - 5*30 + 5 = 700 + 1093.75 - 150 + 5 = 1648.75 → 1649
    expect(calcBMR({ weightKg: 70, heightCm: 175, age: 30, gender: "male" })).toBe(1649);
  });
  it("female formula subtracts 161", () => {
    // 10*70 + 6.25*175 - 5*30 - 161 = 1482.75 → 1483
    expect(calcBMR({ weightKg: 70, heightCm: 175, age: 30, gender: "female" })).toBe(1483);
  });
  it("TDEE multiplies by activity factor (sedentary 1.2)", () => {
    expect(calcTDEE(2000, "sedentary")).toBe(2400);
    expect(calcTDEE(2000, "very_active")).toBe(3800);
  });
});

describe("fastingStage", () => {
  it("maps hours to stage", () => {
    expect(fastingStage(2)).toMatch(/Anabolic/);
    expect(fastingStage(10)).toMatch(/Catabolic/);
    expect(fastingStage(14)).toMatch(/Fat burning/);
    expect(fastingStage(20)).toMatch(/Ketosis/);
    expect(fastingStage(30)).toMatch(/Autophagy/);
  });
});

describe("formatDuration", () => {
  it("zero-pads HH:MM:SS", () => {
    expect(formatDuration(0)).toBe("00:00:00");
    expect(formatDuration(65 * 1000)).toBe("00:01:05");
    expect(formatDuration(3725 * 1000)).toBe("01:02:05");
  });
  it("clamps negatives to zero", () => {
    expect(formatDuration(-1000)).toBe("00:00:00");
  });
});

describe("todayRange", () => {
  it("returns ISO start/end exactly 1 day apart", () => {
    const { start, end } = todayRange();
    const diff = new Date(end).getTime() - new Date(start).getTime();
    expect(diff).toBe(86_400_000);
  });
});

describe("FASTING_PROTOCOLS", () => {
  it("sums to 24h for each protocol", () => {
    for (const p of FASTING_PROTOCOLS) {
      if (p.id === "ramadhan") continue; // 14+10=24 too, but check explicitly
      expect(p.fast + p.eat).toBe(24);
    }
    const ram = FASTING_PROTOCOLS.find((p) => p.id === "ramadhan")!;
    expect(ram.fast + ram.eat).toBe(24);
  });
});