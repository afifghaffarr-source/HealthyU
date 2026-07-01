import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useOnboardingFlag } from "../use-onboarding-flag";

describe("useOnboardingFlag", () => {
  beforeEach(() => window.localStorage.clear());

  it("shows onboarding when no flag set", async () => {
    const { result } = renderHook(() => useOnboardingFlag("tour1"));
    await waitFor(() => expect(result.current.showOnboarding).toBe(true));
  });

  it("hides onboarding after dismiss + persists", async () => {
    const { result } = renderHook(() => useOnboardingFlag("tour2"));
    await waitFor(() => expect(result.current.showOnboarding).toBe(true));
    act(() => result.current.dismiss());
    expect(result.current.showOnboarding).toBe(false);
    expect(window.localStorage.getItem("hu:onboarded:tour2")).toBe("1");
  });

  it("reads existing flag on mount", async () => {
    window.localStorage.setItem("hu:onboarded:tour3", "1");
    const { result } = renderHook(() => useOnboardingFlag("tour3"));
    await waitFor(() => expect(result.current.showOnboarding).toBe(false));
  });

  it("falls back to seen=true when localStorage throws", async () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    const { result } = renderHook(() => useOnboardingFlag("tour4"));
    await waitFor(() => expect(result.current.showOnboarding).toBe(false));
    spy.mockRestore();
  });

  it("dismiss does not throw when localStorage.setItem fails", async () => {
    const { result } = renderHook(() => useOnboardingFlag("tour5"));
    await waitFor(() => expect(result.current.showOnboarding).toBe(true));
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    act(() => result.current.dismiss());
    expect(result.current.showOnboarding).toBe(false);
    spy.mockRestore();
  });
});
