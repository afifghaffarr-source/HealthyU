interface Props {
  consumed: number;
  target: number;
  size?: number;
}

export function CalorieRing({ consumed, target, size = 128 }: Props) {
  const pct = Math.min(100, Math.max(0, (consumed / target) * 100));
  const remaining = Math.max(0, target - consumed);
  const r = 50;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" className="-rotate-90 size-full">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--mint)" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="var(--sage)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums">{Math.round(remaining)}</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">kcal left</span>
      </div>
    </div>
  );
}