import { ChevronLeft } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  action?: ReactNode;
  className?: string;
}

export function TopAppBar({ title, subtitle, showBack, action, className }: Props) {
  const router = useRouter();
  return (
    <header
      className={cn(
        "sticky top-0 z-30 -mx-4 px-4 py-3 bg-background/85 backdrop-blur-xl border-b border-border/40 flex items-center gap-3",
        className,
      )}
    >
      {showBack && (
        <button
          type="button"
          onClick={() => router.history.back()}
          aria-label="Kembali"
          className="-ml-1 inline-flex size-9 items-center justify-center rounded-full hover:bg-muted transition-colors"
        >
          <ChevronLeft className="size-5" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1
          className="text-base font-bold leading-tight truncate"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </h1>
        {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
