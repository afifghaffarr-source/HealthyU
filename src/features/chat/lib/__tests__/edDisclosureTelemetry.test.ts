import { describe, it, expect } from "vitest";

/**
 * Sprint 25 — Eating-Disorder Disclosure Audit Meta Helper.
 *
 * Background: `chatSafety.ts` already detects ED-aware keywords and returns
 * a reply with `kind: "disclaimer-ed"`. The chat.stream endpoint already
 * writes a de-identified row to `audit_log` via `log_audit_event`. Sprint 25
 * (engineering layer only — clinical responses DEFERRED to psychologist
 * sign-off per AUDIT-012 Finding 4 + user memory 2026-06-17) ADDS:
 *
 *   1. A pure helper `buildEdMeta(message)` that derives a richer meta
 *      for the existing server-side audit log: keyword_count, length bucket,
 *      and a has-purge-language flag. NOT a new telemetry path — the
 *      existing chat.stream `log_audit_event` is the single audit surface
 *      so we keep prevalence data clean.
 *
 *   2. The hard rule from AUDIT-017 piiAudit pattern: NEVER log the raw
 *      message text. This test asserts that.
 *
 * Clinical response changes (e.g. adding depression-specific resources) are
 * NOT in scope for Sprint 25 engineering layer — those need psychologist /
 * nutritionist input. Tracked in audit/04-roadmap.md next quarterly review.
 */

import { checkChatSafety, buildEdMeta } from "../chatSafety";

describe("Sprint 25: ED-disclosure detection (engineering layer only)", () => {
  it("returns disclaimer-ed for an Indonesian ED disclosure", () => {
    const r = checkChatSafety("Saya punya anoreksia dan susah makan");
    expect(r.kind).toBe("disclaimer-ed");
  });

  it("returns disclaimer-ed for English ED disclosure", () => {
    const r = checkChatSafety("I think I have binge eating disorder");
    expect(r.kind).toBe("disclaimer-ed");
  });

  it("returns safe (no disclaimer-ed) for non-ED text", () => {
    expect(checkChatSafety("Berapa kalori nasi goreng?").kind).toBe("safe");
    // "apakah saya diabetes" is in the DIAGNOSIS keyword list — returns disclaimer.
    expect(checkChatSafety("Apakah saya diabetes?").kind).toBe("disclaimer");
  });
});

describe("Sprint 25: buildEdMeta contract", () => {
  it("returns null on empty text", () => {
    expect(buildEdMeta("")).toBeNull();
  });

  it("returns null on text without ED keywords", () => {
    expect(buildEdMeta("Berapa kalori nasi goreng?")).toBeNull();
  });

  it("returns null on text with non-ED claimed condition", () => {
    expect(buildEdMeta("Apakah saya diabetes?")).toBeNull();
  });

  it("returns meta object on ED disclosure with keyword_count >= 1", () => {
    const m = buildEdMeta("Saya punya anoreksia dan susah makan");
    expect(m).not.toBeNull();
    expect(m!.category).toBe("ed_disclosure");
    expect(m!.keyword_count).toBeGreaterThanOrEqual(1);
    expect(["short", "medium", "long"]).toContain(m!.length_bucket);
    expect(typeof m!.has_purge_language).toBe("boolean");
    expect(m!.message_length).toBeGreaterThan(0);
  });

  it("counts multiple ED keywords", () => {
    const m = buildEdMeta("Saya punya anoreksia dan bulimia, susah makan dan sering binge eating");
    expect(m).not.toBeNull();
    expect(m!.keyword_count).toBe(3); // anoreksia, bulimia, binge eating
  });

  it("does NOT include the raw message text in the meta", () => {
    const secret = "rahasia-pribadi-disclosure";
    const m = buildEdMeta(`Saya punya anoreksia, ${secret}`);
    expect(m).not.toBeNull();
    const serialized = JSON.stringify(m);
    expect(serialized).not.toContain(secret);
  });

  it("flags has_purge_language when DANGEROUS keywords co-occur", () => {
    const m = buildEdMeta("Aku punya binge eating dan memuntahkan makanan setelah makan");
    expect(m).not.toBeNull();
    expect(m!.has_purge_language).toBe(true);
  });

  it("does NOT flag has_purge_language for pure ED disclosure without purge", () => {
    const m = buildEdMeta("Saya pikir saya punya anoreksia");
    expect(m).not.toBeNull();
    expect(m!.has_purge_language).toBe(false);
  });

  it("length_bucket boundaries: short <= 80, medium <= 240, long > 240", () => {
    const short = "Saya punya anoreksia"; // 19 chars
    expect(buildEdMeta(short)!.length_bucket).toBe("short");

    const medium = "Saya punya anoreksia ".repeat(5); // 100 chars
    expect(buildEdMeta(medium)!.length_bucket).toBe("medium");

    const long = "Saya punya anoreksia ".repeat(20); // 380 chars
    expect(buildEdMeta(long)!.length_bucket).toBe("long");
  });

  it("is pure — same input returns equivalent meta (no side effects)", () => {
    const a = buildEdMeta("Saya punya anoreksia");
    const b = buildEdMeta("Saya punya anoreksia");
    expect(a).toEqual(b);
  });
});
