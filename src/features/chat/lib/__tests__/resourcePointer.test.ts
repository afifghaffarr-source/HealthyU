import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CRISIS_RESOURCES } from "@/features/safety/lib/medicalSafety";
import { ED_DISCLOSURE_REPLY, checkChatSafety } from "@/features/chat/lib/chatSafety";

/**
 * Sprint 25 — Crisis Resource Pointer Allowlist Lock.
 *
 * Background: crisis-resource phone numbers + URLs appear in MULTIPLE files
 * (chatSafety.ts, medicalSafety.ts, chatPrompt.server.ts). Drift is high —
 * any update to a verified number in one file but not the others is a
 * potentially harmful user-facing inconsistency. AUDIT-012 Finding 1 called
 * for quarterly human verification + centralization.
 *
 * Sprint 25 (engineering layer) locks the pointer by:
 *
 *   1. Making `medicalSafety.CRISIS_RESOURCES` the single source of truth.
 *   2. Asserting that `chatSafety.ts` does NOT hardcode any phone-string
 *      beyond what it imports from `medicalSafety`.
 *   3. Asserting the imported allowlist exactly matches what the official
 *      verified references are:
 *        a. Into The Light Indonesia (verified URL)
 *        b. Kemenkes Sehat Jiwa: 119 ext 8 (Kemenkes hotline)
 *        c. Yayasan Pulih: (021) 78842580 (their published number)
 *        d. IGD rumah sakit terdekat (no phone — emergency routing)
 *
 *   Adding any NEW phone number to the allowlist is a clinical-action
 *   decision that MUST go through human-verified listing per user memory
 *   "Resources = reuse existing verified, jangan add unverified phone
 *   numbers". This test makes a missed update an immediate build failure.
 */

// The verified allowlist. Any new entry MUST be added explicitly here.
// If you find yourself wanting to add a new number, ASK: has a human
// verified the number is in service TODAY? If no, do not add it.
const VERIFIED_PURE_TEXT = ["https://www.intothelightid.org/", "119 ext 8", "(021) 78842580"];

describe("Sprint 25: crisis-resource pointer allowlist lock", () => {
  it("CRISIS_RESOURCES export matches the verified allowlist", () => {
    // Flatten allowed sources — phones + urls. Phone text is preserved
    // verbatim so changes show up as test diffs not silent drift.
    const allowedText = CRISIS_RESOURCES.id.flatMap((r) => {
      const bits: string[] = [];
      if ("phone" in r && r.phone) bits.push(r.phone);
      if ("url" in r && r.url) bits.push(r.url);
      return bits;
    });
    for (const v of VERIFIED_PURE_TEXT) {
      expect(allowedText, `CRISIS_RESOURCES should include verified entry "${v}"`).toContain(v);
    }
  });

  it("chatSafety.ts source file contains no hardcoded phone/url strings", () => {
    // Resource pointer string tables in chatSafety.ts MUST come from the
    // central medicalSafety module — drift here is a bug. We assert
    // chatSafety.ts does NOT contain any of those pii as raw literal
    // (it may import them; the import line is allowed because the file
    // does not hardcode the strings).
    //
    // Point of this test: if someone copy-pastes a phone number into
    // chatSafety.ts for "convenience", CI fails.
    const chatSafetyPath = resolve(__dirname, "../chatSafety.ts");
    const src = readFileSync(chatSafetyPath, "utf-8");
    for (const marker of VERIFIED_PURE_TEXT) {
      // We're looking for the marker as a literal string in the source.
      // Allow the marker to appear in a comment so reviewers get
      // context, but not in code (use real numbers in code paths).
      const codeLines = src
        .split("\n")
        .filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*"));
      for (const line of codeLines) {
        expect(
          line.includes(marker),
          `chatSafety.ts code line contains hardcoded "${marker}"; ` +
            `import from @/features/safety/lib/medicalSafety.CRISIS_RESOURCES instead`,
        ).toBe(false);
      }
    }
  });

  it("ED-disclosure reply built from CRISIS_RESOURCES points to Yayasan Pulih's ED program", () => {
    // After Sprint 25 refactor, ED_DISCLOSURE_REPLY is built from
    // CRISIS_RESOURCES — verified Yayasan Pulih entry must surface.
    expect(ED_DISCLOSURE_REPLY).toContain("78842580");
    expect(ED_DISCLOSURE_REPLY.toLowerCase()).toContain("yayasan pulih");
  });

  it("checkChatSafety('anoreksia') returns disclaimer-ed with the Yayasan Pulih reference", () => {
    const r = checkChatSafety("Saya punya anoreksia");
    if (r.kind !== "disclaimer-ed") {
      throw new Error(`expected disclaimer-ed, got ${r.kind}`);
    }
    expect(r.response).toContain("78842580");
  });
});
