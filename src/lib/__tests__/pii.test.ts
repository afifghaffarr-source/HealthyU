import { describe, it, expect } from "vitest";
import { detectPII, containsPII, piiKinds } from "../pii";

describe("detectPII", () => {
  it("returns empty for empty text", () => {
    expect(detectPII("")).toEqual([]);
  });

  it("returns empty for normal nutrition chat", () => {
    expect(detectPII("Berapa kalori dalam nasi goreng?")).toEqual([]);
    expect(detectPII("I ate 200g of chicken for lunch")).toEqual([]);
  });

  it("detects Indonesian mobile phone (08xx)", () => {
    const findings = detectPII("Hubungi saya di 081234567890");
    expect(findings).toHaveLength(1);
    expect(findings[0].kind).toBe("phone");
    expect(findings[0].value).toBe("081234567890");
  });

  it("detects international format phone (+62)", () => {
    const findings = detectPII("Call me at +62 812 3456 7890");
    expect(findings.some((f) => f.kind === "phone")).toBe(true);
  });

  it("detects email address", () => {
    const findings = detectPII("Email saya afif@example.com ya");
    expect(findings).toHaveLength(1);
    expect(findings[0].kind).toBe("email");
    expect(findings[0].value).toBe("afif@example.com");
  });

  it("detects 16-digit KTP/NIK", () => {
    const findings = detectPII("NIK saya 3201234567890001");
    expect(findings.some((f) => f.kind === "ktp")).toBe(true);
  });

  it("detects credit card with spaces", () => {
    const findings = detectPII("Card: 4111 1111 1111 1111");
    expect(findings.some((f) => f.kind === "credit_card")).toBe(true);
  });

  it("detects multiple PII in one text", () => {
    const findings = detectPII("Hubungi 081234567890 atau a@b.com");
    const kinds = findings.map((f) => f.kind);
    expect(kinds).toContain("phone");
    expect(kinds).toContain("email");
  });

  it("findings are sorted by start index", () => {
    const findings = detectPII("a@b.com and 081234567890");
    expect(findings.length).toBe(2);
    expect(findings[0].start).toBeLessThan(findings[1].start);
  });

  it("does not flag 4-digit short numbers (e.g. calories)", () => {
    expect(detectPII("200 kalori")).toEqual([]);
    expect(detectPII("1500 kkal")).toEqual([]);
  });

  it("does not flag common URLs without PII", () => {
    expect(detectPII("check healthyu.web.id/artikel")).toEqual([]);
  });
});

describe("containsPII", () => {
  it("returns true when phone is present", () => {
    expect(containsPII("Hubungi 081234567890")).toBe(true);
  });

  it("returns true when email is present", () => {
    expect(containsPII("a@b.com")).toBe(true);
  });

  it("returns false for clean text", () => {
    expect(containsPII("Halo, apa kabar?")).toBe(false);
  });
});

describe("piiKinds", () => {
  it("returns deduped kinds in detection order", () => {
    const kinds = piiKinds("Hubungi 081234567890 atau a@b.com");
    expect(kinds).toContain("phone");
    expect(kinds).toContain("email");
    expect(new Set(kinds).size).toBe(kinds.length);
  });

  it("returns empty array for clean text", () => {
    expect(piiKinds("Halo!")).toEqual([]);
  });
});
