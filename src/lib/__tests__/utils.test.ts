import { describe, it, expect } from "vitest";
import { cn } from "../utils";

describe("cn", () => {
  it("joins basic class strings", () => {
    expect(cn("a", "b")).toBe("a b");
  });
  it("drops falsy values", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });
  it("merges conflicting tailwind classes (last wins)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });
  it("accepts arrays and object syntax", () => {
    expect(cn(["a", { b: true, c: false }])).toBe("a b");
  });
});