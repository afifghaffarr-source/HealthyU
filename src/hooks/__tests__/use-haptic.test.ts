import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useHaptic } from "../use-haptic";

// Mock navigator.vibrate so we can observe what pattern was sent
type VibrateFn = (p: number | number[]) => boolean;
function setupMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((q: string) => ({
      matches,
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
    })),
  });
}

function setupVibrate() {
  const vibrate = vi.fn().mockReturnValue(true) as unknown as VibrateFn;
  Object.defineProperty(window.navigator, "vibrate", {
    writable: true,
    configurable: true,
    value: vibrate,
  });
  return vibrate;
}

describe("useHaptic", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setupMatchMedia(false);
  });

  afterEach(() => {
    // Clean up any vibrate mock between tests
    Object.defineProperty(window.navigator, "vibrate", {
      writable: true,
      configurable: true,
      value: undefined,
    });
  });

  it("returns a stable callback across renders", () => {
    const { result, rerender } = renderHook(() => useHaptic());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it("calls navigator.vibrate with 'light' pattern by default", () => {
    const vibrate = setupVibrate();
    const { result } = renderHook(() => useHaptic());
    act(() => result.current());
    expect(vibrate).toHaveBeenCalledWith(10);
  });

  it("calls vibrate with the correct pattern for each type", () => {
    const vibrate = setupVibrate();
    const { result } = renderHook(() => useHaptic());
    act(() => result.current("medium"));
    expect(vibrate).toHaveBeenLastCalledWith(18);
    act(() => result.current("success"));
    expect(vibrate).toHaveBeenLastCalledWith([12, 40, 12]);
    act(() => result.current("warning"));
    expect(vibrate).toHaveBeenLastCalledWith([20, 60, 20]);
    act(() => result.current("error"));
    expect(vibrate).toHaveBeenLastCalledWith([30, 50, 30, 50, 30]);
  });

  it("skips vibration when user prefers reduced motion", () => {
    setupMatchMedia(true);
    const vibrate = setupVibrate();
    const { result } = renderHook(() => useHaptic());
    act(() => result.current("error"));
    expect(vibrate).not.toHaveBeenCalled();
  });

  it("does not throw when navigator.vibrate is missing", () => {
    // vibrate explicitly undefined (setupVibrate not called)
    const { result } = renderHook(() => useHaptic());
    expect(() => act(() => result.current("light"))).not.toThrow();
  });

  it("does not throw when matchMedia is unavailable", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: undefined,
    });
    const vibrate = setupVibrate();
    const { result } = renderHook(() => useHaptic());
    expect(() => act(() => result.current("light"))).not.toThrow();
    // Should still vibrate when matchMedia is missing (defaults to not-reduced)
    expect(vibrate).toHaveBeenCalledWith(10);
  });
});
