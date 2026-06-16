import { Toaster as HotToaster } from "react-hot-toast";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Toaster container.
 *
 * Replaces the Sonner-based Toaster. `react-hot-toast` is SSR-safe
 * (it uses an event-emitter + React context, not a module-singleton store),
 * and renders toasts via a portal with no hydration-mismatch issues.
 *
 * The container is forced to client-side only rendering because
 * `react-hot-toast` measures viewport width on mount to position toasts.
 * Rendering an empty placeholder on the server is fine; the real toaster
 * mounts after hydration via `useEffect`.
 */
import { useState, useEffect } from "react";

const Toaster = (props: {
  position?:
    | "top-center"
    | "top-left"
    | "top-right"
    | "bottom-center"
    | "bottom-left"
    | "bottom-right";
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;
  return (
    <HotToaster
      position={props.position ?? "top-center"}
      gutter={8}
      toastOptions={{
        // Slightly longer than DEFAULT_DURATION (2500) for readability.
        duration: prefersReducedMotion ? 4000 : 2500,
        // Use project theme tokens so toasts blend with the design system.
        style: {
          background: "var(--background, #fff)",
          color: "var(--foreground, #0a0a0a)",
          border: "1px solid var(--border, #e5e5e5)",
          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
          fontSize: "0.875rem",
          borderRadius: "0.5rem",
          padding: "0.75rem 1rem",
          maxWidth: "420px",
        },
        // Success / error variants get their own colors that still match
        // the design system (success = green-500, error = red-500).
        success: {
          iconTheme: { primary: "#10b981", secondary: "#fff" },
        },
        error: {
          iconTheme: { primary: "#ef4444", secondary: "#fff" },
        },
      }}
    />
  );
};

export { Toaster };
