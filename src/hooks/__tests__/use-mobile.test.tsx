import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useIsMobile } from "../use-mobile";

type Listener = () => void;

function setup(initialWidth: number) {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: initialWidth,
  });
  const listeners = new Set<Listener>();
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockReturnValue({
      matches: initialWidth < 768,
      media: "(max-width: 767px)",
      addEventListener: (_t: string, l: Listener) => listeners.add(l),
      removeEventListener: (_t: string, l: Listener) => listeners.delete(l),
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
    }),
  });
  return {
    setWidth(w: number) {
      (window as unknown as { innerWidth: number }).innerWidth = w;
      listeners.forEach((l) => l());
    },
  };
}

describe("useIsMobile", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("true when width < 768", () => {
    setup(500);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("false when width >= 768", () => {
    setup(1024);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("reacts to media query change", () => {
    const ctl = setup(1024);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
    act(() => ctl.setWidth(500));
    expect(result.current).toBe(true);
  });
});