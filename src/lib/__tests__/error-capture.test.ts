import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { consumeLastCapturedError } from "../error-capture";

describe("error-capture", () => {
  beforeEach(() => {
    // drain any leftover
    consumeLastCapturedError();
  });
  afterEach(() => vi.useRealTimers());

  it("returns undefined when nothing captured", () => {
    expect(consumeLastCapturedError()).toBeUndefined();
  });

  it("captures from window error event and consumes once", () => {
    const err = new Error("boom");
    window.dispatchEvent(new ErrorEvent("error", { error: err }));
    expect(consumeLastCapturedError()).toBe(err);
    // consumed
    expect(consumeLastCapturedError()).toBeUndefined();
  });

  it("captures from unhandledrejection", () => {
    const reason = new Error("rejected");
    const ev = new Event("unhandledrejection") as Event & { reason: unknown };
    (ev as { reason: unknown }).reason = reason;
    window.dispatchEvent(ev);
    expect(consumeLastCapturedError()).toBe(reason);
  });

  it("expires after TTL (5s)", () => {
    vi.useFakeTimers();
    window.dispatchEvent(new ErrorEvent("error", { error: new Error("stale") }));
    vi.advanceTimersByTime(6_000);
    expect(consumeLastCapturedError()).toBeUndefined();
  });
});
