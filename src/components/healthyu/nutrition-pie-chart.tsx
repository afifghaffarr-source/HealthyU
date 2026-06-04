import { useId } from "react";
import { cn } from "@/lib/utils";

export interface MacroSlice {
  label: string;
  value: number;
  color: string;
}

interface Props {
  data: MacroSlice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string | number;
  className?: string;
}

/**
 * Donut chart for macro/nutrient breakdown.
 * Pure SVG, no chart deps. Respects prefers-reduced-motion (no animation).
 */
export function NutritionPieChart({
  data,
  size = 160,
  thickness = 18,
  centerLabel,
  centerValue,
  className,
}: Props) {
  const id = useId();
  const total = data.reduce((s, d) => s + Math.max(0, d.value), 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90 block">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={thickness} className="stroke-muted" />
          {total > 0 && data.map((d, i) => {
            const frac = Math.max(0, d.value) / total;
            const len = frac * c;
            const dash = `${len} ${c - len}`;
            const dashOffset = -offset;
            offset += len;
            return (
              <circle
                key={`${id}-${i}`}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                strokeWidth={thickness}
                stroke={d.color}
                strokeDasharray={dash}
                strokeDashoffset={dashOffset}
                strokeLinecap="butt"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            {centerValue != null && (
              <div className="text-xl font-bold tabular-nums" style={{ fontFamily: "var(--font-display)" }}>{centerValue}</div>
            )}
            {centerLabel && <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{centerLabel}</div>}
          </div>
        </div>
      </div>
      <ul className="flex-1 space-y-1.5 text-xs">
        {data.map((d) => {
          const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
          return (
            <li key={d.label} className="flex items-center gap-2">
              <span className="size-2.5 rounded-sm shrink-0" style={{ backgroundColor: d.color }} />
              <span className="flex-1 text-muted-foreground">{d.label}</span>
              <span className="font-semibold tabular-nums">{d.value}g</span>
              <span className="text-muted-foreground tabular-nums w-9 text-right">{pct}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}