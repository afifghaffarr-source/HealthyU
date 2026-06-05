import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useReducedMotion } from "../useReducedMotion";

type Listener = (e: MediaQueryListEvent) => void;

function mockMatchMedia(initial: boolean) {
  const listeners = new Set<Listener>();
  const mql = {
    matches: initial,
    media: "(prefers-reduced-motion: reduce)",
    onchange: null,
    addEventListener: (_t: string, l: Listener) => listeners.add(l),
    removeEventListener: (_t: string, l: Listener) => listeners.delete(l),
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  };
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockReturnValue(mql),
  });
  return {
    mql,
    fire: (matches: boolean) => {
      mql.matches = matches;
      listeners.forEach((l) => l({ matches } as MediaQueryListEvent));
    },
  };
}

describe("useReducedMotion", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("initial state from matchMedia", () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });

  it("updates on change event", () => {
    const ctl = mockMatchMedia(false);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
    act(() => ctl.fire(true));
    expect(result.current).toBe(true);
  });
});