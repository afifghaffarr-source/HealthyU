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
} from "../health";

describe("calcAge", () => {
  it("returns 30 for null/undefined", () => {
    expect(calcAge(null)).toBe(30);
    expect(calcAge(undefined)).toBe(30);
  });
  it("computes age from a past date", () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 25);
    d.setDate(d.getDate() - 5); // buffer for 365.25 floor
    expect(calcAge(d)).toBe(25);
  });
});

describe("calcBMI", () => {
  it("computes BMI correctly", () => {
    expect(calcBMI(70, 175)).toBe(22.9);
    expect(calcBMI(50, 160)).toBe(19.5);
  });
});

describe("bmiCategory", () => {
  it("classifies BMI ranges", () => {
    expect(bmiCategory(17).label).toBe("Underweight");
    expect(bmiCategory(22).label).toBe("Normal");
    expect(bmiCategory(27).label).toBe("Overweight");
    expect(bmiCategory(31).label).toBe("Obese");
  });
  it("handles boundaries", () => {
    expect(bmiCategory(18.5).label).toBe("Normal");
    expect(bmiCategory(25).label).toBe("Overweight");
    expect(bmiCategory(30).label).toBe("Obese");
  });
});

describe("calcBMR (Mifflin-St Jeor)", () => {
  it("male formula adds 5", () => {
    expect(calcBMR({ weightKg: 70, heightCm: 175, age: 25, gender: "male" })).toBe(1674);
  });
  it("female formula subtracts 161", () => {
    expect(calcBMR({ weightKg: 60, heightCm: 165, age: 30, gender: "female" })).toBe(1320);
  });
});

describe("calcTDEE", () => {
  it("multiplies by activity factor", () => {
    expect(calcTDEE(1500, "sedentary")).toBe(1800);
    expect(calcTDEE(1500, "very_active")).toBe(2850);
  });
});

describe("fastingStage", () => {
  it("returns stage label per elapsed hours", () => {
    expect(fastingStage(2)).toMatch(/Anabolic/);
    expect(fastingStage(8)).toMatch(/Catabolic/);
    expect(fastingStage(14)).toMatch(/Fat burning/);
    expect(fastingStage(20)).toMatch(/Ketosis/);
    expect(fastingStage(30)).toMatch(/Autophagy/);
  });
});

describe("formatDuration", () => {
  it("formats ms into HH:MM:SS", () => {
    expect(formatDuration(0)).toBe("00:00:00");
    expect(formatDuration(3_661_000)).toBe("01:01:01");
    expect(formatDuration(-1000)).toBe("00:00:00");
  });
});

describe("todayRange", () => {
  it("returns ISO start/end 24h apart", () => {
    const { start, end } = todayRange();
    const diff = new Date(end).getTime() - new Date(start).getTime();
    expect(diff).toBe(24 * 60 * 60 * 1000);
  });
});