/**
 * Tests for medicalSafety detector — pure function.
 *
 * Validates that:
 * - Crisis keywords fire BEFORE dangerous/ed/disclaimer (priority order).
 * - Each category maps to the correct SafetyLevel.
 * - Empty / null input returns safe.
 * - Anti-diagnosis guard wraps prompts idempotently.
 *
 * Per project memory: clinical response logic is intentionally NOT tested
 * here (deferred to psychologist/nutritionist sign-off). We only test the
 * engineering detector.
 */
import { describe, expect, it } from "vitest";
import {
  detectMedicalContext,
  wrapAiSystemPrompt,
  AI_ANTI_DIAGNOSIS_GUARD,
  MEDICAL_DISCLAIMER_DEFAULT,
} from "../medicalSafety";

describe("detectMedicalContext", () => {
  describe("priority order", () => {
    it("crisis > dangerous", () => {
      const r = detectMedicalContext("saya ingin mati dan puasa ekstrim");
      expect(r.level).toBe("crisis");
      expect(r.category).toBe("crisis");
    });

    it("dangerous > ed", () => {
      const r = detectMedicalContext("muntah setelah makan dan anoreksia");
      // "muntah setelah makan" is in DANGEROUS → wins over anoreksia.
      expect(r.level).toBe("dangerous");
      expect(r.category).toBe("dangerous_behavior");
    });

    it("ed > diagnosis", () => {
      const r = detectMedicalContext("saya punya anoreksia dan apakah saya sakit");
      expect(r.level).toBe("ed");
      expect(r.category).toBe("eating_disorder");
    });

    it("diagnosis > medical_condition", () => {
      const r = detectMedicalContext("apakah saya diabetes? tekanan darah tinggi");
      expect(r.level).toBe("disclaimer");
      expect(r.category).toBe("diagnosis");
    });
  });

  describe("each category", () => {
    it("crisis: bunuh diri", () => {
      expect(detectMedicalContext("aku mau bunuh diri").level).toBe("crisis");
    });

    it("crisis: kill myself", () => {
      expect(detectMedicalContext("I want to kill myself").level).toBe("crisis");
    });

    it("crisis: pengen mati (colloquial)", () => {
      expect(detectMedicalContext("gw pengen mati").level).toBe("crisis");
    });

    it("dangerous: extreme fasting", () => {
      expect(detectMedicalContext("puasa ekstrim 7 hari").level).toBe("dangerous");
    });

    it("ed: anoreksia", () => {
      expect(detectMedicalContext("saya anoreksia").level).toBe("ed");
    });

    it("ed: gangguan makan", () => {
      expect(detectMedicalContext("punya gangguan makan").level).toBe("ed");
    });

    it("diagnosis: apakah saya kanker", () => {
      expect(detectMedicalContext("apakah saya kanker").level).toBe("disclaimer");
    });

    it("prescription: berapa dosis metformin", () => {
      expect(detectMedicalContext("berapa dosis metformin yang aman").level).toBe("disclaimer");
    });

    it("medical_condition: hamil", () => {
      expect(detectMedicalContext("saya hamil 3 bulan").level).toBe("disclaimer");
    });
  });

  describe("safe paths", () => {
    it("empty string is safe", () => {
      expect(detectMedicalContext("").level).toBe("safe");
    });

    it("whitespace-only is safe", () => {
      expect(detectMedicalContext("   \n\t  ").level).toBe("safe");
    });

    it("normal nutrition question is safe", () => {
      expect(detectMedicalContext("berapa kalori nasi goreng?").level).toBe("safe");
    });

    it("workout question is safe", () => {
      expect(detectMedicalContext("berapa set untuk pemula squat?").level).toBe("safe");
    });
  });

  describe("PII flag", () => {
    it("triggeredByUserInput defaults to true (input from user)", () => {
      // Note: the detector itself doesn't auto-detect whether the text came
      // from the user or AI output. Callers pass triggeredByUserInput=true
      // when they pass user-input text. This test verifies the default.
      const r = detectMedicalContext("apakah saya hamil");
      // Default per options param is true.
      expect(r.triggeredByUserInput).toBe(true);
    });

    it("triggeredByUserInput=false when passed", () => {
      const r = detectMedicalContext("apakah saya hamil", {
        triggeredByUserInput: false,
      });
      expect(r.triggeredByUserInput).toBe(false);
    });
  });

  describe("case-insensitive matching", () => {
    it("uppercase crisis keyword", () => {
      expect(detectMedicalContext("BUNUH DIRI").level).toBe("crisis");
    });

    it("mixed case English keyword", () => {
      expect(detectMedicalContext("SuIcIdE").level).toBe("crisis");
    });
  });
});

describe("wrapAiSystemPrompt", () => {
  it("appends guard to a plain prompt", () => {
    const wrapped = wrapAiSystemPrompt("You are a coach.");
    expect(wrapped).toContain("HEALTHYU MEDICAL SAFETY GUARD");
    expect(wrapped).toContain("You are a coach.");
  });

  it("is idempotent", () => {
    const once = wrapAiSystemPrompt("Be brief.");
    const twice = wrapAiSystemPrompt(once);
    // Guard should appear exactly once.
    const matches = twice.match(/HEALTHYU MEDICAL SAFETY GUARD/g);
    expect(matches?.length).toBe(1);
  });

  it("includes anti-diagnosis rule", () => {
    expect(AI_ANTI_DIAGNOSIS_GUARD).toContain("BUKAN tenaga kesehatan");
    expect(AI_ANTI_DIAGNOSIS_GUARD).toContain("Jangan pernah memberikan diagnosis");
  });
});

describe("disclaimer copy", () => {
  it("medical disclaimer mentions dokter", () => {
    expect(MEDICAL_DISCLAIMER_DEFAULT).toContain("dokter");
  });

  it("medical disclaimer is not empty", () => {
    expect(MEDICAL_DISCLAIMER_DEFAULT.length).toBeGreaterThan(20);
  });
});
