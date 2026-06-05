import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireConfetti, celebrate } from "../confetti";

function stubMatchMedia(reduced: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockReturnValue({
      matches: reduced,
      media: "(prefers-reduced-motion: reduce)",
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
    }),
  });
}

describe("confetti", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it("no-op when prefers-reduced-motion", () => {
    stubMatchMedia(true);
    fireConfetti({ count: 10 });
    expect(document.body.children.length).toBe(0);
  });

  it("renders count particles and cleans up after 1300ms", () => {
    stubMatchMedia(false);
    fireConfetti({ count: 10 });
    const root = document.body.firstElementChild as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.children.length).toBe(10);
    vi.advanceTimersByTime(1400);
    expect(document.body.children.length).toBe(0);
  });

  it("celebrate intense=true uses 120 particles", () => {
    stubMatchMedia(false);
    celebrate({ intense: true });
    const root = document.body.firstElementChild as HTMLElement;
    expect(root.children.length).toBe(120);
  });

  it("celebrate default uses 50", () => {
    stubMatchMedia(false);
    celebrate();
    const root = document.body.firstElementChild as HTMLElement;
    expect(root.children.length).toBe(50);
  });
});