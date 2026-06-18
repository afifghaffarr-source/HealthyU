import { describe, it, expect } from "vitest";
import { checkChatSafety } from "@/features/chat/lib/chatSafety";

describe("checkChatSafety", () => {
  it("safe for empty/normal messages", () => {
    expect(checkChatSafety("").kind).toBe("safe");
    expect(checkChatSafety("Halo, apa kabar?").kind).toBe("safe");
  });

  it("detects crisis keywords (ID + EN)", () => {
    expect(checkChatSafety("aku ingin mati saja").kind).toBe("crisis");
    expect(checkChatSafety("I want to kill myself").kind).toBe("crisis");
    const r = checkChatSafety("bunuh diri");
    if (r.kind === "crisis") expect(r.response).toMatch(/Into The Light/);
  });

  // AUDIT-012 review (2026-06-16): parametrized coverage for the rest of
  // the CRISIS keyword list. Each entry exercises a different keyword.
  it.each([
    ["mau mati saja", "ID `mau mati`"],
    ["aku ingin mati", "ID `ingin mati`"],
    ["end my life tonight", "EN `end my life`"],
    ["aku potong nadi", "ID `potong nadi`"],
    ["overdosis obat", "ID `overdosis`"],
    ["I cut myself", "EN `cut myself`"],
    ["hang myself tonight", "EN `hang myself`"],
  ])("detects crisis: %s (%s)", (msg) => {
    expect(checkChatSafety(msg).kind).toBe("crisis");
  });

  // AUDIT-012 Finding 3 (2026-06-16, follow-up 2026-06-18): informal /
  // colloquial Indonesian expressions that the original 17-keyword list
  // missed. Conservative additions only — see chatSafety.ts CRISIS list
  // for what we deliberately did NOT add (e.g. "aku depresi" is a
  // clinical decision: depression disclosure is not necessarily crisis,
  // so adding it to CRISIS would over-trigger the existing CRISIS_REPLY
  // for non-suicidal users. Defer to next quarterly review with
  // psychologist input).
  it.each([
    ["aku pengen mati", "ID `pengen mati` (colloquial)"],
    ["mau ngilang aja", "ID `mau ngilang` (pre-crisis)"],
    ["cape hidup", "ID `cape hidup` (tired of life)"],
  ])("detects colloquial crisis: %s (%s)", (msg) => {
    expect(checkChatSafety(msg).kind).toBe("crisis");
  });

  it("blocks dangerous behavior", () => {
    expect(checkChatSafety("aku puasa ekstrim 7 hari").kind).toBe("blocked");
    expect(checkChatSafety("I want to starve myself").kind).toBe("blocked");
  });

  // AUDIT-012 review (2026-06-16): DANGEROUS list has 8 keywords but only
  // 1 was tested. Now cover the rest.
  it.each([
    "aku tidak makan seminggu",
    "tidak makan 7 hari",
    "aku muntah setelah makan",
    "memuntahkan makanan",
    "I want to purge after eating",
    "extreme fasting for 10 days",
  ])("blocks dangerous: %s", (msg) => {
    expect(checkChatSafety(msg).kind).toBe("blocked");
  });

  it("appends disclaimer for diagnosis/prescription", () => {
    expect(checkChatSafety("apakah saya diabetes?").kind).toBe("disclaimer");
    expect(checkChatSafety("berapa dosis paracetamol").kind).toBe("disclaimer");
    expect(checkChatSafety("do i have cancer").kind).toBe("disclaimer");
  });

  // AUDIT-012 review (2026-06-16): cover DIAGNOSIS/PRESCRIPTION/MEDICAL_CONDITIONS
  it.each([
    "apakah saya hamil?", // DIAGNOSIS + MEDICAL_CONDITIONS
    "apakah saya pcos?", // DIAGNOSIS
    "is this cancer", // DIAGNOSIS (EN)
    "metformin dosis berapa", // PRESCRIPTION
    "what medication for headache", // PRESCRIPTION (EN)
    "which drug should I take", // PRESCRIPTION (EN)
    "aku gagal ginjal", // MEDICAL_CONDITIONS
    "penyakit jantung koroner", // MEDICAL_CONDITIONS
    "sedang menyusui", // MEDICAL_CONDITIONS
  ])("appends disclaimer: %s", (msg) => {
    expect(checkChatSafety(msg).kind).toBe("disclaimer");
  });

  it("prioritizes crisis over disclaimer", () => {
    expect(checkChatSafety("apakah saya diabetes dan ingin mati").kind).toBe("crisis");
  });

  it("is case-insensitive", () => {
    expect(checkChatSafety("SUICIDE").kind).toBe("crisis");
    expect(checkChatSafety("Kill MySeLF").kind).toBe("crisis");
  });

  // AUDIT-012 Finding 4 (2026-06-16, 2026-06-17 follow-up): eating-disorder
  // disclosures fall under a more specific disclaimer path. Auto-escalating
  // ED → crisis is a clinical decision deferred to next quarterly review
  // (psychologist/nutritionist sign-off required). Engineering action:
  // detect ED keywords separately, return ED-specific resources appended
  // to the regular AI response, fire analytics event. Caller handles
  // `disclaimer-ed` like `disclaimer` (append to AI reply).
  it.each([
    "aku anoreksia",
    "saya bulimia",
    "aku eating disorder",
    "I have binge eating",
    "kena eating disorder",
  ])("returns disclaimer-ed for ED disclosure: %s", (msg) => {
    const r = checkChatSafety(msg);
    expect(r.kind).toBe("disclaimer-ed");
    if (r.kind === "disclaimer-ed") {
      expect(r.response).toContain("Yayasan Pulih");
      expect(r.response).toMatch(/ahli g(i|ı)zi|psikolog/i);
    }
  });

  it("prioritizes crisis over disclaimer-ed", () => {
    const r = checkChatSafety("aku anoreksia dan ingin mati");
    expect(r.kind).toBe("crisis");
  });

  it("prioritizes blocked over disclaimer-ed", () => {
    const r = checkChatSafety("aku anoreksia dan mau purge after eating");
    expect(r.kind).toBe("blocked");
  });

  it("ED disclosure still beats generic diagnosis/prescription disclaimer", () => {
    // "anoreksia" exists in both MEDICAL_CONDITIONS and ED_DISCLOSURE.
    // ED should win for richer resources.
    const r = checkChatSafety("didiagnosa anoreksia");
    expect(r.kind).toBe("disclaimer-ed");
  });

  it("does not log or leak the message text in the result", () => {
    const r = checkChatSafety("aku anoreksia");
    // The response should contain resources, not the user's words.
    expect(r.kind).toBe("disclaimer-ed");
    if (r.kind === "disclaimer-ed") {
      expect(r.response).not.toContain("anoreksia");
    }
  });
});
