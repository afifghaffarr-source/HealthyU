import { useEffect, useState } from "react";

/**
 * Reactive `prefers-reduced-motion: reduce` matcher. SSR-safe (defaults
 * to `false` on the server).
 */
export function useReducedMotion(): boolean {
  // Lazy initializer reads from matchMedia ONLY on the client first paint
  // — the initial value is already known without an effect.
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- external store sync (matchMedia); re-asserts on mount. */
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}
