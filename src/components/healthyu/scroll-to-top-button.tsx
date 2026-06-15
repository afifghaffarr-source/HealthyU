import { useEffect, useRef, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { ArrowUp } from "lucide-react";

/**
 * Floating "Back to top" button that appears after scrolling.
 * Subtle, only shows on long pages — avoids clutter on short screens.
 */
export function ScrollToTopButton() {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const activeScrollerRef = useRef<Window | Element | null>(null);
  const hideOn = ["/auth"];
  const isHiddenRoute = hideOn.some(
    (path) => location.pathname === path || location.pathname.startsWith(`${path}/`),
  );

  useEffect(() => {
    if (isHiddenRoute) return;

    const readScrollTop = (target?: EventTarget | null) => {
      if (target instanceof Element) {
        activeScrollerRef.current = target;
        return target.scrollTop;
      }

      activeScrollerRef.current = window;
      return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
    };

    const syncVisibility = (target?: EventTarget | null) => {
      setIsVisible(readScrollTop(target) > 160);
    };

    const onScroll = (event: Event) => syncVisibility(event.target);
    const onResize = () => syncVisibility(activeScrollerRef.current);

    syncVisibility();
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      document.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [isHiddenRoute, location.pathname]);

  if (isHiddenRoute) return null;

  return (
    <div className="pointer-events-none fixed bottom-[10.5rem] right-4 z-50 lg:bottom-[5.5rem] lg:right-6">
      <button
        type="button"
        aria-label="Kembali ke atas"
        // LIGHTHOUSE-002 aria-hidden-focus fix: hide from a11y tree AND
        // remove from tab order when not visible (was aria-hidden=true but
        // still focusable → axe serious violation).
        aria-hidden={!isVisible}
        tabIndex={isVisible ? 0 : -1}
        inert={!isVisible}
        onClick={() => {
          const activeScroller = activeScrollerRef.current;
          if (activeScroller instanceof Element) {
            activeScroller.scrollTo({ top: 0, behavior: "smooth" });
            return;
          }

          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        className={`pointer-events-auto grid size-14 place-items-center rounded-full border border-border/70 bg-card/95 text-foreground shadow-xl backdrop-blur transition-all duration-200 supports-[backdrop-filter]:bg-card/85 ${
          isVisible
            ? "translate-y-0 scale-100 opacity-100 hover:scale-105"
            : "pointer-events-none translate-y-3 scale-95 opacity-0"
        }`}
      >
        <ArrowUp className="size-6" aria-hidden="true" strokeWidth={2.4} />
      </button>
    </div>
  );
}
