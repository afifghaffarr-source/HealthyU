import { cn } from "@/lib/utils";

interface Props {
  label: string;
  current: number;
  target: number;
  unit?: string;
  color?: "protein" | "carbs" | "fat" | "fiber" | "primary";
  className?: string;
}

const colorMap: Record<NonNullable<Props["color"]>, string> = {
  protein: "var(--chart-protein)",
  carbs: "var(--chart-carbs)",
  fat: "var(--chart-fat)",
  fiber: "var(--chart-fiber)",
  primary: "var(--primary)",
};

export function MacroBar({
  label,
  current,
  target,
  unit = "g",
  color = "primary",
  className,
}: Props) {
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          <span className="font-semibold text-foreground">{Math.round(current)}</span>
          {" / "}
          {Math.round(target)}
          {unit}
        </span>
      </div>
      <div
        className="h-2 rounded-full bg-muted overflow-hidden"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%`, backgroundColor: colorMap[color] }}
        />
      </div>
    </div>
  );
}
