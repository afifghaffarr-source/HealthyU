"use client";

import { memo, type ReactNode, type CSSProperties } from "react";

interface AuroraTextProps {
  children: ReactNode;
  className?: string;
  colors?: string[];
  speed?: number;
}

/**
 * AuroraText — animated gradient text sweep.
 * Adapted from MagicUI (magicuidesign/magicui) — MIT License.
 * Uses CSS animation (background-position) for smooth color cycling.
 */
export const AuroraText = memo(function AuroraText({
  children,
  className = "",
  colors = ["#16a34a", "#22c55e", "#4ade80", "#16a34a", "#15803d"],
  speed = 1,
}: AuroraTextProps) {
  const style: CSSProperties = {
    backgroundImage: `linear-gradient(135deg, ${colors.join(", ")}, ${colors[0]})`,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    color: "transparent",
    animationDuration: `${10 / speed}s`,
  };
  return (
    <span
      className={`relative inline-block animate-aurora-text bg-size-[200%_auto] ${className}`}
      style={style}
    >
      {children}
    </span>
  );
});
