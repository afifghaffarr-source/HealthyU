import { describe, it, expect, vi, beforeEach } from "vitest";

const { base, sonner } = vi.hoisted(() => {
  const sonner = {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
    promise: vi.fn(),
  };
  const base = vi.fn();
  return { base, sonner };
});

vi.mock("sonner", () => ({
  toast: Object.assign(base, sonner),
}));

import { toast, toastError } from "../toast-config";

beforeEach(() => {
  base.mockReset();
  Object.values(sonner).forEach((m) => m.mockReset());
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
    expect(sonner.success).toHaveBeenCalledWith("ok", { duration: 2500 });
  });
  it("error bumps duration to 3500", () => {
    toast.error("bad");
    expect(sonner.error).toHaveBeenCalledWith("bad", { duration: 3500 });
  });
  it("error allows override but forces 3500 last", () => {
    toast.error("bad", { duration: 100 });
    expect(sonner.error.mock.calls[0][1]).toEqual({ duration: 3500 });
  });
  it("info/warning use 2500", () => {
    toast.info("i");
    toast.warning("w");
    expect(sonner.info).toHaveBeenCalledWith("i", { duration: 2500 });
    expect(sonner.warning).toHaveBeenCalledWith("w", { duration: 2500 });
  });
});

describe("toastError", () => {
  it("uses Error.message", () => {
    toastError(new Error("oops"));
    expect(sonner.error).toHaveBeenCalledWith("oops", { duration: 3500 });
  });
  it("uses raw string", () => {
    toastError("nope");
    expect(sonner.error).toHaveBeenCalledWith("nope", { duration: 3500 });
  });
  it("falls back to default 'Gagal'", () => {
    toastError({ weird: true });
    expect(sonner.error).toHaveBeenCalledWith("Gagal", { duration: 3500 });
  });
  it("falls back to custom string", () => {
    toastError(null, "Try again");
    expect(sonner.error).toHaveBeenCalledWith("Try again", { duration: 3500 });
  });
  it("empty Error.message falls back", () => {
    toastError(new Error(""), "fallback");
    expect(sonner.error).toHaveBeenCalledWith("fallback", { duration: 3500 });
  });
});
