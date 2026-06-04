import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "default" | "success" | "warning" | "danger" | "info" | "primary";

const toneClass: Record<Tone, string> = {
  default: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
  info: "text-info",
  primary: "text-primary",
};

interface Props {
  icon?: LucideIcon;
  label: string;
  value: string | number;
  unit?: string;
  tone?: Tone;
  className?: string;
}

export function StatTile({ icon: Icon, label, value, unit, tone = "default", className }: Props) {
  return (
    <div className={cn("bg-card p-3 rounded-2xl outline-1 outline-black/5 text-center", className)}>
      {Icon && <Icon className={cn("size-4 mx-auto mb-1", toneClass[tone])} />}
      <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
        {label}
      </p>
      <p className={cn("text-sm font-bold font-mono-tabular", toneClass[tone])}>{value}</p>
      {unit && <p className="text-[10px] text-muted-foreground">{unit}</p>}
    </div>
  );
}
