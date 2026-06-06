import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { ArrowUp } from "lucide-react";

/**
 * Floating "Back to top" button that appears after scrolling.
 * Subtle, only shows on long pages — avoids clutter on short screens.
 */
export function ScrollToTopButton() {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const hideOn = ["/", "/auth"];
  const isHiddenRoute = hideOn.some(
    (path) => location.pathname === path || location.pathname.startsWith(`${path}/`),
  );

  useEffect(() => {
    const onScroll = () => setIsVisible(window.scrollY > 220);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (isHiddenRoute || !isVisible) return null;

  return (
    <button
      type="button"
      aria-label="Kembali ke atas"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-[5.75rem] left-4 z-50 grid h-11 w-11 place-items-center rounded-full border border-border/60 bg-card text-foreground shadow-lg backdrop-blur transition-transform duration-200 hover:scale-105 lg:bottom-6 lg:left-auto lg:right-[5.25rem]"
    >
      <ArrowUp className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}