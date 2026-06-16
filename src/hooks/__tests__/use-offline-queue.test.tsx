import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock the offline-queue lib BEFORE importing the hook
vi.mock("@/lib/offline-queue", () => ({
  count: vi.fn().mockResolvedValue(0),
  flush: vi.fn().mockResolvedValue({ synced: 0, failed: 0 }),
}));

// Mock all the server-function modules the hook calls
vi.mock("@/features/water/lib/water.functions", () => ({ logWater: vi.fn() }));
vi.mock("@/features/vitals/lib/weight.functions", () => ({ addWeight: vi.fn() }));
vi.mock("@/features/meals/lib/meals.functions", () => ({ logMeal: vi.fn() }));
vi.mock("@/features/mood/lib/mood.functions", () => ({ addMood: vi.fn() }));
vi.mock("@/features/vitals/lib/vitals.functions", () => ({ addVitals: vi.fn() }));
vi.mock("@/features/workout/lib/workouts.functions", () => ({ logWorkout: vi.fn() }));

// Mock useServerFn to return a callable that just resolves
vi.mock("@tanstack/react-start", () => ({
  useServerFn: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
}));

// Import after mocks
import { useOfflineQueue } from "../use-offline-queue";
import * as queue from "@/lib/offline-queue";

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useOfflineQueue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window.navigator, "onLine", {
      writable: true,
      configurable: true,
      value: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns online/pending/sync API", () => {
    const { result } = renderHook(() => useOfflineQueue(), { wrapper: makeWrapper() });
    expect(result.current).toHaveProperty("online");
    expect(result.current).toHaveProperty("pending");
    expect(result.current).toHaveProperty("sync");
    expect(typeof result.current.sync).toBe("function");
  });

  it("starts with online=true when navigator.onLine is true", () => {
    const { result } = renderHook(() => useOfflineQueue(), { wrapper: makeWrapper() });
    expect(result.current.online).toBe(true);
  });

  it("reads initial pending count from queue on mount", async () => {
    // Use persistent mock (not mockResolvedValueOnce) since the hook calls
    // count() on mount + on every sync() call (initial + periodic interval)
    vi.mocked(queue.count).mockResolvedValue(3);
    const { result } = renderHook(() => useOfflineQueue(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.pending).toBe(3));
  });

  it("sync() calls flush with all 6 syncer types", async () => {
    const { result } = renderHook(() => useOfflineQueue(), { wrapper: makeWrapper() });
    await act(async () => {
      await result.current.sync();
    });
    // flush may also be called on mount (when navigator.onLine); assert at least 1 call
    expect(queue.flush).toHaveBeenCalled();
    const lastCall = vi.mocked(queue.flush).mock.calls.at(-1)!;
    const syncers = lastCall[0];
    expect(Object.keys(syncers).sort()).toEqual(
      ["meal", "mood", "vitals", "water", "weight", "workout"].sort(),
    );
    // Each syncer is async callable
    for (const k of Object.keys(syncers)) {
      expect(typeof syncers[k as keyof typeof syncers]).toBe("function");
    }
  });

  it("sync() refreshes pending count after flush", async () => {
    // initial mount + initial sync + post-flush sync = 3 count calls
    // Make 1st return 5, then 2 onwards return 2
    vi.mocked(queue.count).mockResolvedValueOnce(5).mockResolvedValue(2);
    vi.mocked(queue.flush).mockResolvedValue({ synced: 3, failed: 0 });
    const { result } = renderHook(() => useOfflineQueue(), { wrapper: makeWrapper() });
    // First count=5 (from mount refresh), then count=2 (from mount sync)
    await waitFor(() => expect(result.current.pending).toBe(2));
    await act(async () => {
      await result.current.sync();
    });
    // After sync, count is called again → still 2
    await waitFor(() => expect(result.current.pending).toBe(2));
  });

  it("toggles online state on window online/offline events", async () => {
    const { result } = renderHook(() => useOfflineQueue(), { wrapper: makeWrapper() });
    expect(result.current.online).toBe(true);
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current.online).toBe(false);
    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current.online).toBe(true);
  });
});
