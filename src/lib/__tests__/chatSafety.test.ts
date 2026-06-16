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
    "aku eating disorder", // MEDICAL_CONDITIONS
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
});
