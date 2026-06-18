import { describe, it, expect } from "vitest";
import { redactPII } from "../pii";

describe("redactPII", () => {
  it("returns text unchanged when no PII is present", () => {
    expect(redactPII("halo, makan nasi goreng yuk")).toBe("halo, makan nasi goreng yuk");
  });

  it("replaces Indonesian phone numbers with [REDACTED:phone]", () => {
    expect(redactPII("hubungi 081234567890 ya")).toBe("hubungi [REDACTED:phone] ya");
  });

  it("replaces international format +62xxx with [REDACTED:phone]", () => {
    expect(redactPII("call +6281234567")).toBe("call [REDACTED:phone]");
  });

  it("replaces email addresses with [REDACTED:email]", () => {
    expect(redactPII("kirim ke afif@example.com")).toBe("kirim ke [REDACTED:email]");
  });

  it("replaces KTP/NIK (16 digits) with [REDACTED:ktp]", () => {
    expect(redactPII("NIK saya 3201234567890001")).toBe("NIK saya [REDACTED:ktp]");
  });

  it("replaces credit-card-like numbers with [REDACTED:credit_card]", () => {
    // 16 digits with spaces (Luhn-passable length)
    expect(redactPII("card 4111 1111 1111 1111 ya")).toBe("card [REDACTED:credit_card] ya");
  });

  it("replaces MULTIPLE PII kinds in one message", () => {
    const input = "email saya a@b.com atau 081234567890 atau NIK 3201234567890001";
    const output = redactPII(input);
    // "NIK " is the user's own label, not PII — only the 16 digits get redacted.
    expect(output).toBe(
      "email saya [REDACTED:email] atau [REDACTED:phone] atau NIK [REDACTED:ktp]",
    );
  });

  it("preserves surrounding whitespace and punctuation", () => {
    expect(redactPII("(081234567890)")).toBe("([REDACTED:phone])");
    expect(redactPII("kontak: a@b.com;")).toBe("kontak: [REDACTED:email];");
  });

  it("handles empty / non-string gracefully", () => {
    expect(redactPII("")).toBe("");
  });

  it("is idempotent: redacting twice gives same result as redacting once", () => {
    const input = "hubungi 081234567890 atau a@b.com";
    const once = redactPII(input);
    const twice = redactPII(once);
    expect(twice).toBe(once);
  });
});
