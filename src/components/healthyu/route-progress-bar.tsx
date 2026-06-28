import { useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Slim top progress bar that animates during route transitions.
 * Gives users feedback that navigation is in progress without a full spinner.
 */
export function RouteProgressBar() {
  const isLoading = useRouterState({ select: (s) => s.isLoading || s.isTransitioning });
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isLoading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- external-store/async-query sync; `useSyncExternalStore` and equivalent restructure would change the API surface
      setShow(true);
      return;
    }
    // Keep bar visible briefly so users see it complete
    const t = setTimeout(() => setShow(false), 250);
    return () => clearTimeout(t);
  }, [isLoading]);

  return (
    <div
      aria-hidden="true"
      className={cn(
        "fixed top-0 left-0 right-0 z-[60] h-0.5 overflow-hidden pointer-events-none transition-opacity duration-200",
        show ? "opacity-100" : "opacity-0",
      )}
    >
      <div
        className={cn(
          "h-full bg-gradient-to-r from-primary/40 via-primary to-primary/40",
          isLoading ? "animate-route-progress" : "w-full",
        )}
      />
    </div>
  );
}
