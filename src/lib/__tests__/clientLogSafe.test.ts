import { describe, it, expect, vi } from "vitest";
import { clientSafeError } from "../clientLogSafe";

describe("clientLogSafe", () => {
  it("logs error with scope and message", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    clientSafeError("TestScope", new Error("boom"));
    expect(spy).toHaveBeenCalledWith("[TestScope]", "boom");
    spy.mockRestore();
  });

  it("includes extra metadata when provided", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    clientSafeError("TestScope", new Error("boom"), { code: 42 });
    expect(spy).toHaveBeenCalledWith('[TestScope] {"code":42}', "boom");
    spy.mockRestore();
  });

  it("handles non-Error values", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    clientSafeError("TestScope", "string error");
    expect(spy).toHaveBeenCalledWith("[TestScope]", "string error");
    spy.mockRestore();
  });

  it("no metadata when extra is undefined", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    clientSafeError("TestScope", new Error("boom"), undefined);
    expect(spy).toHaveBeenCalledWith("[TestScope]", "boom");
    spy.mockRestore();
  });
});
