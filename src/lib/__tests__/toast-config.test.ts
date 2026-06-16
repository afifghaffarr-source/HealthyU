import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

const { base, rht } = vi.hoisted(() => {
  const rht: Record<string, Mock> = {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
    promise: vi.fn(),
  };
  // react-hot-toast exports a function as default; methods live on it.
  // We use `as never` for the call-signature so the type-checker doesn't
  // fight the test framework's complex Mock generics.
  const base: Mock = Object.assign(vi.fn(), rht) as never;
  return { base, rht };
});

vi.mock("react-hot-toast", () => ({
  default: base,
}));

import { toast, toastError } from "../toast-config";

beforeEach(() => {
  base.mockReset();
  Object.values(rht).forEach((m) => m.mockReset());
});

describe("toast (base)", () => {
  it("applies default duration 2500", () => {
    toast("hello");
    expect(base).toHaveBeenCalledWith("hello", { duration: 2500 });
  });
  it("merges user opts over defaults", () => {
    toast("hi", { duration: 9000, id: "x" });
    expect(base).toHaveBeenCalledWith("hi", { duration: 9000, id: "x" });
  });
});

describe("toast variants", () => {
  it("success uses default 2500", () => {
    toast.success("ok");
    expect(rht.success).toHaveBeenCalledWith("ok", { duration: 2500 });
  });
  it("error bumps duration to 3500", () => {
    toast.error("bad");
    expect(rht.error).toHaveBeenCalledWith("bad", { duration: 3500 });
  });
  it("error allows override but forces 3500 last", () => {
    toast.error("bad", { duration: 100 });
    expect(rht.error.mock.calls[0][1]).toEqual({ duration: 3500 });
  });
  it("info/warning use 2500 (default call path)", () => {
    toast.info("i");
    toast.warning("w");
    // info + warning both route through the default toast call.
    expect(base).toHaveBeenCalledWith("i", { duration: 2500 });
    expect(base).toHaveBeenCalledWith("w", { duration: 2500 });
  });
});

describe("toastError", () => {
  it("uses Error.message", () => {
    toastError(new Error("oops"));
    expect(rht.error).toHaveBeenCalledWith("oops", { duration: 3500 });
  });
  it("uses raw string", () => {
    toastError("nope");
    expect(rht.error).toHaveBeenCalledWith("nope", { duration: 3500 });
  });
  it("falls back to default 'Gagal'", () => {
    toastError({ weird: true });
    expect(rht.error).toHaveBeenCalledWith("Gagal", { duration: 3500 });
  });
  it("falls back to custom string", () => {
    toastError(null, "Try again");
    expect(rht.error).toHaveBeenCalledWith("Try again", { duration: 3500 });
  });
  it("empty Error.message falls back", () => {
    toastError(new Error(""), "fallback");
    expect(rht.error).toHaveBeenCalledWith("fallback", { duration: 3500 });
  });
});
