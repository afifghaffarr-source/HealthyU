import { describe, it, expect } from "vitest";
import { SYSTEM_PROMPT } from "@/features/chat/lib/chatPrompt.server";

/**
 * Sprint 25 — Humane-Tone Baseline Lock.
 *
 * Goal: every AI prompt that the HealthyU coach emits stays non-shaming and
 * culturally aware. Any new prompt additions that introduce shame language
 * or remove cultural examples MUST fail this test.
 *
 * Conservative thresholds: wordlists target the patterns most likely to be
 * accidentally introduced (typo, copy-paste from a less-careful prompt).
 * "Gagal" is on the list because it's a common coaching-failure framing in
 * Indonesian diet contexts; we want the prompt to use "coba lagi" / "besok".
 *
 * Positive-tone assertions ensure the prompt EXPLICITLY carries the humane
 * baseline (currently uses "tidak menghakimi", "supportif"). If a future
 * prompt drops these markers, the test fails.
 */

const SHAME_WORDS_ID = [
  "gagal diet", // "diet failure" framing
  "kamu gagal", // "you failed"
  "kamu malas", // "you're lazy"
  "badan ideal", // "ideal body"
  "harus kurus", // "must be thin"
  "kamu bodoh", // "you're stupid"
];

const SHAME_WORDS_EN = [
  "you failed",
  "you are lazy",
  "ideal body",
  "must be thin",
  "you're stupid",
];

// + supportif akan dipakai di saat Sprint 25 baseline di-expanded. Untuk
// sekarang, lock AS-IS yang ada di SYSTEM_PROMPT.
const POSITIVE_TONE_MARKERS = ["tidak menghakimi", "SUPPORTIF"];

const CULTURAL_AWARENESS_MARKERS = [
  "Nasi", // staple
  "Gorengan", // local snack
  "Sambal", // condiment
  "Kopi susu", // popular drink
];

describe("Sprint 25: coach SYSTEM_PROMPT humane-tone baseline", () => {
  it("does not contain Indonesian shame language", () => {
    for (const w of SHAME_WORDS_ID) {
      expect(SYSTEM_PROMPT, `prompt should not contain shame word "${w}"`).not.toContain(w);
    }
  });

  it("does not contain English shame language", () => {
    for (const w of SHAME_WORDS_EN) {
      expect(SYSTEM_PROMPT, `prompt should not contain shame word "${w}"`).not.toContain(w);
    }
  });

  it("explicitly carries humane-tone markers", () => {
    for (const m of POSITIVE_TONE_MARKERS) {
      expect(SYSTEM_PROMPT, `prompt should carry humane marker "${m}"`).toContain(m);
    }
  });

  it("explicitly carries Indonesian cultural awareness markers (Nasi/gorengan/sambal/kopi susu)", () => {
    for (const m of CULTURAL_AWARENESS_MARKERS) {
      expect(SYSTEM_PROMPT, `prompt should reference cultural term "${m}"`).toContain(m);
    }
  });
});
