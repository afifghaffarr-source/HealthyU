import { useReducedMotion } from "@/hooks/useReducedMotion";

interface Props {
  consumed: number;
  target: number;
  size?: number;
  macros?: { protein?: number; carbs?: number; fat?: number };
}

export function CalorieRing({ consumed, target, size = 180, macros }: Props) {
  const pct = Math.min(100, Math.max(0, (consumed / target) * 100));
  const remaining = Math.max(0, target - consumed);
  const r = 50;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  const prefersReducedMotion = useReducedMotion();

  const rInner = 36;
  const cInner = 2 * Math.PI * rInner;
  const macroTotal = macros ? (macros.protein ?? 0) + (macros.carbs ?? 0) + (macros.fat ?? 0) : 0;
  const segP = macroTotal > 0 ? ((macros!.protein ?? 0) / macroTotal) * cInner : 0;
  const segC = macroTotal > 0 ? ((macros!.carbs ?? 0) / macroTotal) * cInner : 0;
  const segF = macroTotal > 0 ? ((macros!.fat ?? 0) / macroTotal) * cInner : 0;

  const isCompact = size < 160;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          viewBox="0 0 120 120"
          className="-rotate-90 size-full"
          aria-label={`${Math.round(consumed)} dari ${target} kkal`}
        >
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
              <circle
                cx="60"
                cy="60"
                r={rInner}
                fill="none"
                stroke="var(--muted)"
                strokeWidth="6"
                opacity="0.35"
              />
              <circle
                cx="60"
                cy="60"
                r={rInner}
                fill="none"
                stroke="var(--chart-protein)"
                strokeWidth="6"
                strokeDasharray={`${segP} ${cInner - segP}`}
                strokeDashoffset={0}
              />
              <circle
                cx="60"
                cy="60"
                r={rInner}
                fill="none"
                stroke="var(--chart-carbs)"
                strokeWidth="6"
                strokeDasharray={`${segC} ${cInner - segC}`}
                strokeDashoffset={-segP}
              />
              <circle
                cx="60"
                cy="60"
                r={rInner}
                fill="none"
                stroke="var(--chart-fat)"
                strokeWidth="6"
                strokeDasharray={`${segF} ${cInner - segF}`}
                strokeDashoffset={-(segP + segC)}
              />
            </g>
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center leading-none text-center px-2">
          <span className={`${isCompact ? "text-xl" : "text-3xl"} font-bold tabular-nums`}>
            {Math.round(remaining)}
          </span>
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">
            kcal sisa
          </span>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground tabular-nums">
        {Math.round(consumed)} / {target} kkal
      </p>
      {macroTotal > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[10px]">
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full" style={{ background: "var(--chart-protein)" }} />
            Protein
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full" style={{ background: "var(--chart-carbs)" }} />
            Karbo
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full" style={{ background: "var(--chart-fat)" }} />
            Lemak
          </span>
        </div>
      )}
    </div>
  );
}
