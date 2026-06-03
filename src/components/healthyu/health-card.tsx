import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface Props {
  icon?: LucideIcon;
  label: string;
  value: string | number;
  unit?: string;
  trend?: string;
  tone?: "green" | "orange" | "blue" | "neutral";
  className?: string;
}

const toneStyles: Record<NonNullable<Props["tone"]>, { bg: string; fg: string }> = {
  green: { bg: "bg-[var(--health-green-100)]", fg: "text-[var(--health-green-700)]" },
  orange: { bg: "bg-[color-mix(in_oklch,var(--health-orange-500)_15%,transparent)]", fg: "text-[var(--health-orange-700)]" },
  blue: { bg: "bg-[color-mix(in_oklch,var(--health-blue-500)_15%,transparent)]", fg: "text-[var(--health-blue-500)]" },
  neutral: { bg: "bg-muted", fg: "text-muted-foreground" },
};

export function HealthCard({ icon: Icon, label, value, unit, trend, tone = "neutral", className }: Props) {
  const t = toneStyles[tone];
  return (
    <div className={cn(
      "rounded-2xl bg-card border border-border/60 p-4 shadow-[var(--shadow-elev-1)] hover:shadow-[var(--shadow-elev-2)] transition-shadow",
      className,
    )}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        {Icon && (
          <span className={cn("inline-flex size-8 items-center justify-center rounded-xl", t.bg, t.fg)}>
            <Icon className="size-4" strokeWidth={2.2} />
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold tabular-nums" style={{ fontFamily: "var(--font-display)" }}>{value}</span>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
      {trend && <p className={cn("text-[11px] mt-1", t.fg)}>{trend}</p>}
    </div>
  );
}