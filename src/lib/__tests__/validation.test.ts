import { describe, it, expect } from "vitest";
import {
  slugSchema,
  chatMessageSchema,
  paginationSchema,
  weightKgSchema,
  parseInput,
  emailSchema,
} from "../validation";
import { z } from "zod";

describe("slugSchema", () => {
  it("accepts lowercase + digits + dashes", () => {
    expect(slugSchema.safeParse("hello-world-1").success).toBe(true);
  });
  it("rejects uppercase / spaces", () => {
    expect(slugSchema.safeParse("Hello World").success).toBe(false);
    expect(slugSchema.safeParse("HELLO").success).toBe(false);
  });
  it("enforces max length 120", () => {
    expect(slugSchema.safeParse("a".repeat(121)).success).toBe(false);
    expect(slugSchema.safeParse("a".repeat(120)).success).toBe(true);
  });
});

describe("chatMessageSchema", () => {
  it("accepts a plain message", () => {
    expect(chatMessageSchema.safeParse({ message: "hi" }).success).toBe(true);
  });
  it("rejects oversize message (>2000 chars)", () => {
    expect(chatMessageSchema.safeParse({ message: "x".repeat(2001) }).success).toBe(false);
  });
  it("rejects unsupported image mime", () => {
    expect(chatMessageSchema.safeParse({ message: "hi", imageMime: "image/gif" }).success).toBe(
      false,
    );
  });
});

describe("paginationSchema", () => {
  it("applies defaults", () => {
    expect(paginationSchema.parse({})).toEqual({ limit: 20, offset: 0 });
  });
  it("caps limit at 100", () => {
    expect(paginationSchema.safeParse({ limit: 999 }).success).toBe(false);
  });
});

describe("weightKgSchema", () => {
  it("rejects negative + over 500", () => {
    expect(weightKgSchema.safeParse(-1).success).toBe(false);
    expect(weightKgSchema.safeParse(501).success).toBe(false);
    expect(weightKgSchema.safeParse(70).success).toBe(true);
  });
});

describe("emailSchema", () => {
  it("accepts valid email", () => {
    expect(emailSchema.safeParse("a@b.co").success).toBe(true);
  });
  it("rejects invalid", () => {
    expect(emailSchema.safeParse("notanemail").success).toBe(false);
  });
});

describe("parseInput", () => {
  const s = z.object({ n: z.number() });
  it("returns parsed data on success", () => {
    expect(parseInput(s, { n: 1 })).toEqual({ n: 1 });
  });
  it("throws with prefixed 'Validation error:' on failure", () => {
    expect(() => parseInput(s, { n: "x" })).toThrow(/Validation error:/);
  });
});
