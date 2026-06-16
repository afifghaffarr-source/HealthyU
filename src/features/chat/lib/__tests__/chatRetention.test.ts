import { describe, it, expect } from "vitest";
import {
  validateChatRetentionDays,
  describeChatRetention,
  CHAT_RETENTION_OPTIONS,
  MIN_RETENTION_DAYS,
  MAX_RETENTION_DAYS,
} from "../chatRetention";

describe("validateChatRetentionDays", () => {
  it("accepts null (forever)", () => {
    expect(validateChatRetentionDays(null)).toBeNull();
    expect(validateChatRetentionDays(undefined)).toBeNull();
  });

  it("accepts boundary values", () => {
    expect(validateChatRetentionDays(MIN_RETENTION_DAYS)).toBe(MIN_RETENTION_DAYS);
    expect(validateChatRetentionDays(MAX_RETENTION_DAYS)).toBe(MAX_RETENTION_DAYS);
  });

  it("accepts common values (30, 90, 180, 365)", () => {
    for (const days of [30, 90, 180, 365]) {
      expect(validateChatRetentionDays(days)).toBe(days);
    }
  });

  it("rejects non-integer numbers", () => {
    expect(() => validateChatRetentionDays(30.5)).toThrow(/integer/);
  });

  it("rejects values below minimum", () => {
    expect(() => validateChatRetentionDays(29)).toThrow(/between/);
    expect(() => validateChatRetentionDays(0)).toThrow(/between/);
    expect(() => validateChatRetentionDays(-1)).toThrow(/between/);
  });

  it("rejects values above maximum", () => {
    expect(() => validateChatRetentionDays(MAX_RETENTION_DAYS + 1)).toThrow(/between/);
    expect(() => validateChatRetentionDays(100000)).toThrow(/between/);
  });

  it("rejects non-number types", () => {
    expect(() => validateChatRetentionDays("30")).toThrow();
    expect(() => validateChatRetentionDays(true)).toThrow();
    expect(() => validateChatRetentionDays({})).toThrow();
    expect(() => validateChatRetentionDays([])).toThrow();
  });
});

describe("describeChatRetention", () => {
  it("returns 'Selamanya' for null", () => {
    expect(describeChatRetention(null)).toMatch(/selamanya/i);
  });

  it("returns days for small values", () => {
    expect(describeChatRetention(30)).toMatch(/30 hari/);
    expect(describeChatRetention(45)).toMatch(/45 hari/);
  });

  it("returns months for medium values", () => {
    expect(describeChatRetention(60)).toMatch(/bulan/);
    expect(describeChatRetention(180)).toMatch(/bulan/);
  });

  it("returns years for large values", () => {
    expect(describeChatRetention(365)).toMatch(/tahun/);
    expect(describeChatRetention(730)).toMatch(/tahun/);
  });
});

describe("CHAT_RETENTION_OPTIONS", () => {
  it("starts with null (forever) as the privacy-preserving default", () => {
    expect(CHAT_RETENTION_OPTIONS[0].value).toBeNull();
    expect(CHAT_RETENTION_OPTIONS[0].label).toMatch(/selamanya/i);
  });

  it("only includes values within the valid range", () => {
    for (const opt of CHAT_RETENTION_OPTIONS) {
      if (opt.value === null) continue;
      expect(opt.value).toBeGreaterThanOrEqual(MIN_RETENTION_DAYS);
      expect(opt.value).toBeLessThanOrEqual(MAX_RETENTION_DAYS);
    }
  });

  it("has Indonesian labels and descriptions", () => {
    for (const opt of CHAT_RETENTION_OPTIONS) {
      expect(opt.label).toBeTruthy();
      expect(opt.description).toBeTruthy();
      // Indonesian text should not be just English
      expect(opt.label.length).toBeGreaterThan(5);
    }
  });
});
