import { Flame } from "lucide-react";

export function StreakRing({
  days,
  goal = 30,
  size = 96,
}: {
  days: number;
  goal?: number;
  size?: number;
}) {
  const pct = Math.min(1, days / goal);
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={6}
          className="stroke-muted fill-none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={6}
          strokeLinecap="round"
          fill="none"
          stroke="url(#streak-grad)"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 600ms ease-out" }}
        />
        <defs>
          <linearGradient id="streak-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Flame className="size-4 text-amber-500" />
        <span className="text-lg font-bold leading-none">{days}</span>
        <span className="text-[9px] text-muted-foreground">hari</span>
      </div>
    </div>
  );
}
