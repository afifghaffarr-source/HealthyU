/**
 * AdherenceRing — circular SVG progress ring for visual adherence %.
 * Self-contained, no library. Color shifts: low (<60) red, mid (60-89) amber, high (>=90) emerald.
 */
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, { px: number; stroke: number; font: string }> = {
  sm: { px: 48, stroke: 5, font: "text-xs" },
  md: { px: 72, stroke: 6, font: "text-base" },
  lg: { px: 104, stroke: 8, font: "text-xl" },
};

function colorFor(pct: number): string {
  if (pct >= 90) return "stroke-emerald-500";
  if (pct >= 60) return "stroke-amber-500";
  return "stroke-rose-500";
}

function textColorFor(pct: number): string {
  if (pct >= 90) return "text-emerald-600 dark:text-emerald-400";
  if (pct >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

export function AdherenceRing({
  pct,
  size = "md",
  label,
  className,
}: {
  pct: number;
  size?: Size;
  label?: string;
  className?: string;
}) {
  const { px, stroke, font } = SIZES[size];
  const radius = (px - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  // Clamp pct to [0, 100]; cap display at 100% but real value can exceed
  const displayPct = Math.min(100, Math.max(0, pct));
  const offset = circumference * (1 - displayPct / 100);

  return (
    <div className={cn("inline-flex flex-col items-center gap-1", className)}>
      <div
        className="relative"
        style={{ width: px, height: px }}
        aria-label={`Adherence ${Math.round(pct)}%`}
      >
        <svg className="rotate-[-90deg]" width={px} height={px} viewBox={`0 0 ${px} ${px}`}>
          <circle
            cx={px / 2}
            cy={px / 2}
            r={radius}
            className="stroke-muted"
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            cx={px / 2}
            cy={px / 2}
            r={radius}
            className={cn("transition-all duration-500", colorFor(pct))}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div
          className={cn(
            "absolute inset-0 grid place-items-center font-bold tabular-nums",
            font,
            textColorFor(pct),
          )}
        >
          {Math.round(pct)}%
        </div>
      </div>
      {label && (
        <p className="text-[10px] text-muted-foreground text-center font-medium">{label}</p>
      )}
    </div>
  );
}
