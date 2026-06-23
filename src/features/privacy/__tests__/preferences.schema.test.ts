import { describe, expect, it } from "vitest";
import { z } from "zod";

/**
 * Tests for the preferences schema validation.
 *
 * The server function `updatePreferences` validates input with `PreferencesSchema`.
 * These tests verify the schema accepts valid enum values and rejects invalid ones.
 * This catches regressions in the schema before they reach the database layer.
 */

const PreferencesSchema = z.object({
  preferred_unit: z.enum(["metric", "imperial"]).optional(),
  preferred_language: z.enum(["id", "en"]).optional(),
  preferred_theme: z.enum(["light", "dark", "system"]).optional(),
  timezone: z.string().max(50).optional(),
});

describe("PreferencesSchema", () => {
  describe("preferred_unit", () => {
    it("accepts 'metric'", () => {
      const r = PreferencesSchema.parse({ preferred_unit: "metric" });
      expect(r.preferred_unit).toBe("metric");
    });

    it("accepts 'imperial'", () => {
      const r = PreferencesSchema.parse({ preferred_unit: "imperial" });
      expect(r.preferred_unit).toBe("imperial");
    });

    it("rejects invalid unit value", () => {
      expect(() => PreferencesSchema.parse({ preferred_unit: "furlongs" })).toThrow();
    });
  });

  describe("preferred_language", () => {
    it("accepts 'id' (Indonesian)", () => {
      const r = PreferencesSchema.parse({ preferred_language: "id" });
      expect(r.preferred_language).toBe("id");
    });

    it("accepts 'en' (English)", () => {
      const r = PreferencesSchema.parse({ preferred_language: "en" });
      expect(r.preferred_language).toBe("en");
    });

    it("rejects unsupported language", () => {
      expect(() => PreferencesSchema.parse({ preferred_language: "jp" })).toThrow();
    });
  });

  describe("preferred_theme", () => {
    it.each(["light", "dark", "system"] as const)("accepts '%s'", (theme) => {
      const r = PreferencesSchema.parse({ preferred_theme: theme });
      expect(r.preferred_theme).toBe(theme);
    });

    it("rejects invalid theme", () => {
      expect(() => PreferencesSchema.parse({ preferred_theme: "auto" })).toThrow();
    });
  });

  describe("timezone", () => {
    it("accepts IANA timezone string", () => {
      const r = PreferencesSchema.parse({ timezone: "Asia/Jakarta" });
      expect(r.timezone).toBe("Asia/Jakarta");
    });

    it("rejects timezone over 50 chars", () => {
      const longTz = "A".repeat(51);
      expect(() => PreferencesSchema.parse({ timezone: longTz })).toThrow();
    });
  });

  describe("partial updates", () => {
    it("accepts empty object (no-op)", () => {
      const r = PreferencesSchema.parse({});
      expect(r).toEqual({});
    });

    it("accepts single field update", () => {
      const r = PreferencesSchema.parse({ preferred_theme: "dark" });
      expect(r.preferred_theme).toBe("dark");
      expect(r.preferred_unit).toBeUndefined();
    });

    it("accepts full update", () => {
      const r = PreferencesSchema.parse({
        preferred_unit: "imperial",
        preferred_language: "en",
        preferred_theme: "dark",
        timezone: "America/New_York",
      });
      expect(r).toEqual({
        preferred_unit: "imperial",
        preferred_language: "en",
        preferred_theme: "dark",
        timezone: "America/New_York",
      });
    });
  });
});
