import { useEffect, type RefObject } from "react";

/**
 * Mini focus-trap for small non-modal dialogs (aria-modal="false").
 * - Cycles Tab/Shift+Tab between the first/last ref.
 * - Calls onEscape() on Escape key (caller restores focus).
 *
 * Refs MUST be in tab order (first = first focusable, last = last focusable).
 */
export function useMiniFocusTrap(
  active: boolean,
  refs: ReadonlyArray<RefObject<HTMLElement | null>>,
  onEscape?: () => void,
  options?: { autoFocusFirst?: boolean },
) {
  useEffect(() => {
    if (!active || refs.length === 0) return;
    const first = refs[0];
    const last = refs[refs.length - 1];
    if (options?.autoFocusFirst) first.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onEscape?.();
        return;
      }
      if (e.key !== "Tab") return;
      const activeEl = document.activeElement;
      if (e.shiftKey && activeEl === first.current) {
        e.preventDefault();
        last.current?.focus();
      } else if (!e.shiftKey && activeEl === last.current) {
        e.preventDefault();
        first.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, refs, onEscape, options?.autoFocusFirst]);
}
