import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  action?: ReactNode;
  className?: string;
}

export function SectionHeader({ title, action, className }: Props) {
  return (
    <div className={cn("flex items-end justify-between mb-3", className)}>
      <h2
        className="text-sm font-bold uppercase tracking-wider text-muted-foreground"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </h2>
      {action && <div className="text-xs">{action}</div>}
    </div>
  );
}
