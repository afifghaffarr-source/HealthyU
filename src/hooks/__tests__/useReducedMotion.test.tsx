import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { useReducedMotion } from "../useReducedMotion";

type Listener = (e: MediaQueryListEvent) => void;

let listeners: Listener[] = [];
let currentMatches = false;

function setupMatchMedia(initial: boolean) {
  currentMatches = initial;
  listeners = [];
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: currentMatches,
    media: "(prefers-reduced-motion: reduce)",
    addEventListener: (_: string, cb: Listener) => listeners.push(cb),
    removeEventListener: (_: string, cb: Listener) => {
      listeners = listeners.filter((l) => l !== cb);
    },
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
    onchange: null,
  })) as unknown as typeof window.matchMedia;
}

function Probe({ onValue }: { onValue: (v: boolean) => void }) {
  const reduced = useReducedMotion();
  onValue(reduced);
  return <span data-testid="v">{String(reduced)}</span>;
}

afterEach(cleanup);
beforeEach(() => setupMatchMedia(false));

describe("useReducedMotion", () => {
  it("reflects initial matchMedia state", () => {
    setupMatchMedia(true);
    const { getByTestId } = render(<Probe onValue={() => {}} />);
    expect(getByTestId("v").textContent).toBe("true");
  });

  it("updates on media query change event", () => {
    const values: boolean[] = [];
    render(<Probe onValue={(v) => values.push(v)} />);
    expect(values.at(-1)).toBe(false);
    act(() => {
      currentMatches = true;
      listeners.forEach((l) => l({ matches: true } as MediaQueryListEvent));
    });
    expect(values.at(-1)).toBe(true);
  });
});
