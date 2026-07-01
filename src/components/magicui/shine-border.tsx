"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ShineBorderProps extends React.HTMLAttributes<HTMLDivElement> {
  borderWidth?: number;
  duration?: number;
  shineColor?: string | string[];
}

/**
 * ShineBorder — animated background border, CSS-only (no motion dep).
 * Adapted from MagicUI (magicuidesign/magicui) — MIT License.
 * Uses radial-gradient + mask-composite to animate a glowing border.
 */
export function ShineBorder({
  borderWidth = 1,
  duration = 14,
  shineColor = "var(--primary)",
  className,
  style,
  ...props
}: ShineBorderProps) {
  const colors = Array.isArray(shineColor) ? shineColor : [shineColor];
  return (
    <div
      style={
        {
          "--sb-border-width": `${borderWidth}px`,
          "--sb-duration": `${duration}s`,
          backgroundImage: `radial-gradient(transparent, transparent, ${colors.join(",")}, transparent, transparent)`,
          backgroundSize: "300% 300%",
          mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          padding: "var(--sb-border-width)",
          ...style,
        } as React.CSSProperties
      }
      className={cn(
        "motion-safe:animate-shine-border pointer-events-none absolute inset-0 size-full rounded-[inherit] will-change-[background-position]",
        className,
      )}
      {...props}
    />
  );
}
