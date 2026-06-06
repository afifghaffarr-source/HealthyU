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

  it("blocks dangerous behavior", () => {
    expect(checkChatSafety("aku puasa ekstrim 7 hari").kind).toBe("blocked");
    expect(checkChatSafety("I want to starve myself").kind).toBe("blocked");
  });

  it("appends disclaimer for diagnosis/prescription", () => {
    expect(checkChatSafety("apakah saya diabetes?").kind).toBe("disclaimer");
    expect(checkChatSafety("berapa dosis paracetamol").kind).toBe("disclaimer");
    expect(checkChatSafety("do i have cancer").kind).toBe("disclaimer");
  });

  it("prioritizes crisis over disclaimer", () => {
    expect(checkChatSafety("apakah saya diabetes dan ingin mati").kind).toBe("crisis");
  });

  it("is case-insensitive", () => {
    expect(checkChatSafety("SUICIDE").kind).toBe("crisis");
  });
});
