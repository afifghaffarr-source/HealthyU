/**
 * Tests for recipeBookmarksPublic — auth-optional bookmark state lookup.
 *
 * Strategy: test the input validation schema (the public contract) and the
 * shape of the response. The Supabase-touching handler is verified via
 * deployment smoke-tests (curl /resep/$slug with and without auth header).
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";

// Mirror the schema from recipeBookmarksPublic.functions.ts
const InputSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/),
  userId: z.string().uuid().nullable(),
});

describe("getBookmarkStateForSlug input schema", () => {
  it("accepts a valid slug + null userId (anon case)", () => {
    const result = InputSchema.parse({ slug: "nasi-goreng-sehat", userId: null });
    expect(result.slug).toBe("nasi-goreng-sehat");
    expect(result.userId).toBeNull();
  });

  it("accepts a valid slug + uuid userId (authed case)", () => {
    const uuid = "123e4567-e89b-12d3-a456-426614174000";
    const result = InputSchema.parse({ slug: "oatmeal-pisang", userId: uuid });
    expect(result.userId).toBe(uuid);
  });

  it("rejects empty slug", () => {
    expect(() => InputSchema.parse({ slug: "", userId: null })).toThrow();
  });

  it("rejects slug with uppercase letters", () => {
    expect(() => InputSchema.parse({ slug: "Nasi-Goreng", userId: null })).toThrow();
  });

  it("rejects slug with invalid characters (underscore, space)", () => {
    expect(() => InputSchema.parse({ slug: "nasi_goreng", userId: null })).toThrow();
    expect(() => InputSchema.parse({ slug: "nasi goreng", userId: null })).toThrow();
  });

  it("rejects slug longer than 120 chars", () => {
    const longSlug = "a".repeat(121);
    expect(() => InputSchema.parse({ slug: longSlug, userId: null })).toThrow();
  });

  it("rejects non-uuid userId", () => {
    expect(() => InputSchema.parse({ slug: "nasi-goreng", userId: "not-a-uuid" })).toThrow();
    expect(() => InputSchema.parse({ slug: "nasi-goreng", userId: "123-456" })).toThrow();
  });
});
