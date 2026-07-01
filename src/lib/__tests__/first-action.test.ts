import { describe, it, expect, beforeEach, vi } from "vitest";
import { markFirstAction, hasCompletedFirstAction } from "../first-action";

describe("first-action", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("markFirstAction sets localStorage flag", () => {
    markFirstAction();
    expect(localStorage.getItem("healthyu-first-action")).toBe("1");
  });

  it("hasCompletedFirstAction returns true after marking", () => {
    expect(hasCompletedFirstAction()).toBe(false);
    markFirstAction();
    expect(hasCompletedFirstAction()).toBe(true);
  });

  it("hasCompletedFirstAction returns false when not set", () => {
    expect(hasCompletedFirstAction()).toBe(false);
  });

  it("returns false when localStorage throws (private mode)", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(hasCompletedFirstAction()).toBe(false);
    spy.mockRestore();
  });

  it("markFirstAction does not throw when localStorage throws", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(() => markFirstAction()).not.toThrow();
    spy.mockRestore();
  });
});
