"use client";

import { useRef, type ReactNode, type CSSProperties } from "react";
import { motion, useInView, type Variants } from "motion/react";
import { cn } from "@/lib/utils";

interface BlurFadeProps {
  children: ReactNode;
  className?: string;
  duration?: number;
  delay?: number;
  offset?: number;
  direction?: "up" | "down" | "left" | "right";
  inView?: boolean;
  inViewMargin?: string;
  blur?: string;
}

/**
 * BlurFade — scroll-triggered blur + fade reveal.
 * Adapted from MagicUI (magicuidesign/magicui) — MIT License.
 * Uses motion's useInView for once-only reveal.
 */
export function BlurFade({
  children,
  className,
  duration = 0.4,
  delay = 0,
  offset = 6,
  direction = "down",
  inView = true,
  inViewMargin = "-50px",
  blur = "6px",
}: BlurFadeProps) {
  const ref = useRef(null);
  const inViewResult = useInView(ref, { once: true, margin: inViewMargin as never });
  const isInView = !inView || inViewResult;

  const axis = direction === "left" || direction === "right" ? "x" : "y";
  const offsetVal = direction === "right" || direction === "down" ? -offset : offset;

  const variants: Variants = {
    hidden: { [axis]: offsetVal, opacity: 0, filter: `blur(${blur})` },
    visible: { [axis]: 0, opacity: 1, filter: "blur(0px)" },
  };

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={variants}
      transition={{ delay: 0.04 + delay, duration, ease: "easeOut", filter: { duration } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
