import { describe, it, expect } from "vitest";
import {
  calcBMI,
  bmiCategory,
  calcBMR,
  calcTDEE,
  calcBodyFat,
  calcIdealWeight,
  calcWaterIntake,
  calcMacros,
  calcHeartRateZones,
  ACTIVITY,
} from "../calculators";

describe("calculators", () => {
  it("calcBMI", () => {
    expect(+calcBMI(70, 175).toFixed(2)).toBe(22.86);
  });
  it("bmiCategory (ID)", () => {
    expect(bmiCategory(17)).toBe("Berat badan kurang");
    expect(bmiCategory(22)).toBe("Normal");
    expect(bmiCategory(27)).toBe("Berat badan berlebih");
    expect(bmiCategory(31)).toBe("Obesitas");
  });
  it("calcBMR", () => {
    expect(calcBMR(70, 175, 25, "male")).toBe(1673.75);
    expect(calcBMR(60, 165, 30, "female")).toBe(1320.25);
  });
  it("calcTDEE uses activity factor", () => {
    expect(calcTDEE(1500, "sedentary")).toBe(1500 * 1.2);
    expect(calcTDEE(1500, "veryActive")).toBe(1500 * 1.9);
  });
  it("calcBodyFat (Deurenberg)", () => {
    // male: 1.2*25 + 0.23*30 - 10.8 - 5.4 = 30 + 6.9 - 16.2 = 20.7
    expect(+calcBodyFat(25, 30, "male").toFixed(2)).toBe(20.7);
    // female: 1.2*25 + 0.23*30 - 5.4 = 31.5
    expect(+calcBodyFat(25, 30, "female").toFixed(2)).toBe(31.5);
  });
  it("calcIdealWeight (Devine)", () => {
    expect(calcIdealWeight(150, "male")).toBe(50); // below 5ft -> floor
    expect(calcIdealWeight(175, "female")).toBeGreaterThan(45.5);
  });
  it("calcWaterIntake adds 500ml when active", () => {
    expect(calcWaterIntake(70, "sedentary")).toBe(70 * 35);
    expect(calcWaterIntake(70, "active")).toBe(70 * 35 + 500);
    expect(calcWaterIntake(70, "veryActive")).toBe(70 * 35 + 500);
  });
  it("calcMacros 30/40/30 + goal delta", () => {
    const cut = calcMacros(2000, "cut");
    expect(cut.calories).toBe(1500);
    const bulk = calcMacros(2000, "bulk");
    expect(bulk.calories).toBe(2300);
    const maintain = calcMacros(2000, "maintain");
    expect(maintain.calories).toBe(2000);
    // protein 30% / 4
    expect(maintain.macros.protein).toBe((2000 * 0.3) / 4);
  });
  it("calcHeartRateZones returns 5 zones with max = 220-age", () => {
    const r = calcHeartRateZones(30);
    expect(r.max).toBe(190);
    expect(r.zones).toHaveLength(5);
    expect(r.zones[4].max).toBe(190);
  });
  it("ACTIVITY map has all 5 keys", () => {
    expect(Object.keys(ACTIVITY)).toHaveLength(5);
  });
});
