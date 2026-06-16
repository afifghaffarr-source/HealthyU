import { useState, useEffect } from "react";
import { Toaster as Sonner } from "sonner";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const prefersReducedMotion = useReducedMotion();
  // Force client-side only rendering to avoid SSR hydration issues with
  // Sonner's internal store subscription. The toaster container will
  // only mount after hydration, ensuring toast() calls are properly received.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;
  return (
    <Sonner
      className="toaster group"
      richColors
      expand
      visibleToasts={3}
      // Saat prefers-reduced-motion aktif: matikan slide/swipe, hanya fade.
      duration={prefersReducedMotion ? 4000 : undefined}
      toastOptions={{
        classNames: {
          toast: `group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg${
            prefersReducedMotion
              ? " motion-reduce:transition-opacity motion-reduce:!transform-none"
              : ""
          }`,
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
