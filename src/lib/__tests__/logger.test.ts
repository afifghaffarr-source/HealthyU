import { describe, it, expect, vi } from "vitest";
import { sanitizeLogMeta, logServerError, logServerWarn } from "../logger.server";

describe("sanitizeLogMeta", () => {
  it("returns undefined for undefined", () => {
    expect(sanitizeLogMeta(undefined)).toBeUndefined();
  });
  it("redacts sensitive keys", () => {
    const out = sanitizeLogMeta({ token: "abc", password: "x", Email: "a@b", safe: 1 })!;
    expect(out.token).toBe("[redacted]");
    expect(out.password).toBe("[redacted]");
    expect(out.Email).toBe("[redacted]");
    expect(out.safe).toBe(1);
  });
  it("truncates long strings", () => {
    const long = "a".repeat(300);
    const out = sanitizeLogMeta({ note: long })!;
    expect((out.note as string).startsWith("a".repeat(200))).toBe(true);
    expect(out.note).toContain("truncated 100");
  });
});

describe("logServerError", () => {
  it("logs error name + message + sanitized meta", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logServerError("scope", new Error("boom"), { token: "x", ok: 1 });
    expect(spy).toHaveBeenCalled();
    const [, payload] = spy.mock.calls[0];
    expect(payload).toMatchObject({ message: "boom", name: "Error", meta: { token: "[redacted]", ok: 1 } });
    spy.mockRestore();
  });
  it("stringifies non-Error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logServerError("s", "oops");
    expect(spy.mock.calls[0][1]).toMatchObject({ message: "oops" });
    spy.mockRestore();
  });
});

describe("logServerWarn", () => {
  it("warns with sanitized meta", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    logServerWarn("s", "msg", { secret: "x" });
    expect(spy).toHaveBeenCalledWith("[s] msg", { secret: "[redacted]" });
    spy.mockRestore();
  });
});