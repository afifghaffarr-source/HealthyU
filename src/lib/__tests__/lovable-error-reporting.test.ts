import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { reportLovableError } from "../lovable-error-reporting";

const captureException = vi.fn();

beforeEach(() => {
  captureException.mockReset();
  (window as unknown as { __lovableEvents?: unknown }).__lovableEvents = {
    captureException,
  };
});

afterEach(() => {
  delete (window as unknown as { __lovableEvents?: unknown }).__lovableEvents;
});

describe("reportLovableError", () => {
  it("forwards error + context + options with defaults", () => {
    const err = new Error("boom");
    reportLovableError(err, { extra: "v" });
    expect(captureException).toHaveBeenCalledTimes(1);
    const [arg, ctx, opts] = captureException.mock.calls[0];
    expect(arg).toBe(err);
    expect(ctx).toMatchObject({
      source: "react_error_boundary",
      route: window.location.pathname,
      extra: "v",
    });
    expect(opts).toEqual({
      mechanism: "react_error_boundary",
      handled: false,
      severity: "error",
    });
  });

  it("works without context", () => {
    reportLovableError("err");
    expect(captureException).toHaveBeenCalled();
    expect(captureException.mock.calls[0][1]).toMatchObject({
      source: "react_error_boundary",
    });
  });

  it("no-op when __lovableEvents missing", () => {
    delete (window as unknown as { __lovableEvents?: unknown }).__lovableEvents;
    expect(() => reportLovableError(new Error("x"))).not.toThrow();
  });

  it("no-op when captureException missing", () => {
    (window as unknown as { __lovableEvents?: unknown }).__lovableEvents = {};
    expect(() => reportLovableError(new Error("x"))).not.toThrow();
    expect(captureException).not.toHaveBeenCalled();
  });
});