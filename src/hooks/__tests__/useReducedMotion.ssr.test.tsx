import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useReducedMotion } from "../useReducedMotion";

describe("useReducedMotion (SSR snapshot)", () => {
  const original = window.matchMedia;
  beforeEach(() => {
    // Simulate SSR/legacy env: matchMedia tidak tersedia.
    // @ts-expect-error overriding for test
    delete window.matchMedia;
  });
  afterEach(() => {
    window.matchMedia = original;
  });
  it("returns false tanpa crash saat matchMedia undefined", () => {
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });
});