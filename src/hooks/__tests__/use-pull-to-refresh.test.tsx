import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { usePullToRefresh } from "../use-pull-to-refresh";

function touchEvent(type: string, y: number) {
  const ev = new Event(type, { bubbles: true }) as Event & { touches: { clientY: number }[] };
  (ev as { touches: { clientY: number }[] }).touches = [{ clientY: y }];
  return ev;
}

describe("usePullToRefresh", () => {
  beforeEach(() => {
    Object.defineProperty(window, "scrollY", { writable: true, configurable: true, value: 0 });
  });

  it("does not pull when scrolled", () => {
    Object.defineProperty(window, "scrollY", { writable: true, configurable: true, value: 100 });
    const onRefresh = vi.fn();
    const { result } = renderHook(() => usePullToRefresh(onRefresh));
    act(() => {
      window.dispatchEvent(touchEvent("touchstart", 0));
      window.dispatchEvent(touchEvent("touchmove", 200));
    });
    expect(result.current.pulling).toBe(0);
  });

  it("tracks pulling with 0.5x damp and 80 cap", () => {
    const { result } = renderHook(() => usePullToRefresh(vi.fn()));
    act(() => {
      window.dispatchEvent(touchEvent("touchstart", 0));
      window.dispatchEvent(touchEvent("touchmove", 100));
    });
    expect(result.current.pulling).toBe(50);
    act(() => window.dispatchEvent(touchEvent("touchmove", 500)));
    expect(result.current.pulling).toBe(80);
  });

  it("triggers onRefresh past threshold (60) and resets", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => usePullToRefresh(onRefresh));
    act(() => {
      window.dispatchEvent(touchEvent("touchstart", 0));
      window.dispatchEvent(touchEvent("touchmove", 200)); // pulling=80
    });
    act(() => {
      window.dispatchEvent(new Event("touchend"));
    });
    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.refreshing).toBe(false));
    expect(result.current.pulling).toBe(0);
  });

  it("does not trigger below threshold", () => {
    const onRefresh = vi.fn();
    renderHook(() => usePullToRefresh(onRefresh));
    act(() => {
      window.dispatchEvent(touchEvent("touchstart", 0));
      window.dispatchEvent(touchEvent("touchmove", 20)); // pulling=10
      window.dispatchEvent(new Event("touchend"));
    });
    expect(onRefresh).not.toHaveBeenCalled();
  });
});
