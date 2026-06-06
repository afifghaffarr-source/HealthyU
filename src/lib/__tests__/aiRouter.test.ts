import { describe, it, expect, vi } from "vitest";
import {
  classifyMessage,
  buildCompactProfile,
  compactTodayBlock,
} from "@/features/ai/lib/aiRouter.server";

describe("classifyMessage", () => {
  it("tier 3 for image", () => {
    const r = classifyMessage("apa ini?", true);
    expect(r.tier).toBe(3);
    expect(r.reason).toBe("image");
  });
  it("tier 3 for emergency", () => {
    expect(classifyMessage("saya nyeri dada hebat", false).reason).toBe("emergency");
    expect(classifyMessage("ada yang muntah darah", false).reason).toBe("emergency");
  });
  it("local rule for greeting and water", () => {
    const a = classifyMessage("halo", false);
    expect(a.tier).toBe(1);
    expect(a.localAnswer).toBeTruthy();
    expect(classifyMessage("berapa target air per hari?", false).tier).toBe(1);
  });
  it("tier 3 when >=30 words AND >=2 complex hints", () => {
    const text =
      "tolong tolong buat sebuah rencana menu 7 hari untuk diabetes dan hipertensi dengan analisis " +
      "kandungan gizi serta evaluasi korelasi gula darah dan tekanan darah harian saya selama " +
      "seminggu penuh ke depan ini supaya saya bisa konsisten benar";
    expect(classifyMessage(text, false).reason).toBe("complex");
  });
  it("default tier 2 flash", () => {
    const r = classifyMessage("apa manfaat brokoli", false);
    expect(r.tier).toBe(2);
    expect(r.model).toBe("google/gemini-2.5-flash");
  });
});

describe("buildCompactProfile", () => {
  function client(profile: unknown) {
    return {
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: profile }) }) }),
      }),
    } as never;
  }

  it("returns anon when no profile", async () => {
    const res = await buildCompactProfile(client(null), "u1");
    expect(res.hash).toBe("anon");
  });

  it("builds block + stable hash", async () => {
    const p = {
      full_name: "Ali",
      gender: "male",
      birth_date: "1990-01-01",
      weight_kg: 70,
      height_cm: 170,
      target_weight_kg: 65,
      activity_level: "moderate",
      daily_calorie_target: 2000,
      dietary_preference: "none",
      allergies: ["udang"],
      health_conditions: ["diabetes"],
    };
    const a = await buildCompactProfile(client(p), "u1");
    const b = await buildCompactProfile(client(p), "u1");
    expect(a.hash).toBe(b.hash);
    expect(a.block).toContain("Ali");
    expect(a.block).toContain("BMI");
  });
});

describe("compactTodayBlock", () => {
  it("formats today summary", () => {
    const s = compactTodayBlock({
      cal: 1500.7,
      calTarget: 2000,
      burn: 300.4,
      water: 1500,
      fastingActive: true,
      sleepH: 7.25,
      workoutDone: false,
    });
    expect(s).toContain("1501/2000kal");
    expect(s).toContain("air1500ml");
    expect(s).toContain("olahraga–");
    expect(s).toContain("puasa✓");
    expect(s).toContain("tidur7.3j");
  });
  it("handles null sleep", () => {
    expect(
      compactTodayBlock({
        cal: 0,
        calTarget: 0,
        burn: 0,
        water: 0,
        fastingActive: false,
        sleepH: null,
        workoutDone: true,
      }),
    ).toContain("tidur-");
  });
});
