import { useReducedMotion } from "@/hooks/useReducedMotion";

interface Props {
  consumed: number;
  target: number;
  size?: number;
  /** Optional macro split (grams) for inner ring segments */
  macros?: { protein?: number; carbs?: number; fat?: number };
}

export function CalorieRing({ consumed, target, size = 180, macros }: Props) {
  const pct = Math.min(100, Math.max(0, (consumed / target) * 100));
  const remaining = Math.max(0, target - consumed);
  const r = 50;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  const prefersReducedMotion = useReducedMotion();

  // Inner macro ring (optional)
  const rInner = 36;
  const cInner = 2 * Math.PI * rInner;
  const macroTotal = macros ? (macros.protein ?? 0) + (macros.carbs ?? 0) + (macros.fat ?? 0) : 0;
  const segP = macroTotal > 0 ? ((macros!.protein ?? 0) / macroTotal) * cInner : 0;
  const segC = macroTotal > 0 ? ((macros!.carbs ?? 0) / macroTotal) * cInner : 0;
  const segF = macroTotal > 0 ? ((macros!.fat ?? 0) / macroTotal) * cInner : 0;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" className="-rotate-90 size-full">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--mint)" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          className="transition-all"
          style={{ transitionDuration: prefersReducedMotion ? "0ms" : "700ms" }}
        />
        {macroTotal > 0 && (
          <g>
            <circle cx="60" cy="60" r={rInner} fill="none" stroke="var(--muted)" strokeWidth="6" opacity="0.35" />
            <circle cx="60" cy="60" r={rInner} fill="none" stroke="var(--chart-protein)" strokeWidth="6"
              strokeDasharray={`${segP} ${cInner - segP}`} strokeDashoffset={0} />
            <circle cx="60" cy="60" r={rInner} fill="none" stroke="var(--chart-carbs)" strokeWidth="6"
              strokeDasharray={`${segC} ${cInner - segC}`} strokeDashoffset={-segP} />
            <circle cx="60" cy="60" r={rInner} fill="none" stroke="var(--chart-fat)" strokeWidth="6"
              strokeDasharray={`${segF} ${cInner - segF}`} strokeDashoffset={-(segP + segC)} />
          </g>
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tabular-nums font-[var(--font-display)]">{Math.round(remaining)}</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">kcal tersisa</span>
        <span className="mt-1 text-[10px] text-muted-foreground tabular-nums">{Math.round(consumed)} / {target}</span>
      </div>
    </div>
  );
}