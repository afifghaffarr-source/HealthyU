/**
 * Lightweight haptic feedback hook for PWA / mobile browsers that expose
 * the Vibration API. Falls back to a no-op when unsupported or when the
 * user prefers reduced motion (we treat that as a hint to skip haptics too).
 */
import { useCallback } from "react";

type Pattern = "light" | "medium" | "success" | "warning" | "error";

const PATTERNS: Record<Pattern, number | number[]> = {
  light: 10,
  medium: 18,
  success: [12, 40, 12],
  warning: [20, 60, 20],
  error: [30, 50, 30, 50, 30],
};

export function useHaptic() {
  return useCallback((pattern: Pattern = "light") => {
    if (typeof window === "undefined") return;
    try {
      const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
      if (reduced) return;
      const nav = window.navigator as Navigator & {
        vibrate?: (p: number | number[]) => boolean;
      };
      nav.vibrate?.(PATTERNS[pattern]);
    } catch {
      /* ignore */
    }
  }, []);
}
