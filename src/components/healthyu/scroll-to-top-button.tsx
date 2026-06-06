import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Floating "Back to top" button that appears after scrolling.
 * Subtle, only shows on long pages — avoids clutter on short screens.
 */
export function ScrollToTopButton() {
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const hideOn = ["/", "/auth"];
  const isHiddenRoute = hideOn.some(
    (path) => location.pathname === path || location.pathname.startsWith(`${path}/`),
  );

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 180);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (isHiddenRoute) return null;

  return (
    <Button
      type="button"
      size="icon"
      variant="secondary"
      aria-label="Kembali ke atas"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={cn(
        "fixed bottom-[5.75rem] left-4 z-50 h-11 w-11 rounded-full border border-border/60 bg-card/95 shadow-lg backdrop-blur transition-all duration-300 lg:bottom-6 lg:left-auto lg:right-[5.25rem]",
        visible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-4 pointer-events-none",
      )}
    >
      <ArrowUp className="h-5 w-5" aria-hidden="true" />
    </Button>
  );
}