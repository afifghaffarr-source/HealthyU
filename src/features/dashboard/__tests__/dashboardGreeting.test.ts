import { describe, it, expect, vi, afterEach } from "vitest";
import { dashboardGreeting } from "@/features/dashboard/lib/dashboardGreeting";

afterEach(() => {
  vi.useRealTimers();
});

describe("dashboardGreeting", () => {
  it("returns morning greeting before 11", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-16T08:00:00"));
    expect(dashboardGreeting()).toBe("Selamat pagi");
  });

  it("returns afternoon greeting at 12", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-16T12:00:00"));
    expect(dashboardGreeting()).toBe("Selamat siang");
  });

  it("returns late afternoon greeting at 16", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-16T16:00:00"));
    expect(dashboardGreeting()).toBe("Selamat sore");
  });

  it("returns evening greeting at 20", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-16T20:00:00"));
    expect(dashboardGreeting()).toBe("Selamat malam");
  });
});
