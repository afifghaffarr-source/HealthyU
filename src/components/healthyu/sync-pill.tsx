import { WifiOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  online: boolean;
  pending: number;
  onSync: () => void;
  className?: string;
}

export function SyncPill({ online, pending, onSync, className }: Props) {
  if (online && pending === 0) return null;
  return (
    <button
      type="button"
      onClick={onSync}
      aria-label={online ? `Sync ${pending} item tertunda` : "Mode offline"}
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-full transition-colors",
        online ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground",
        className,
      )}
    >
      {online ? <RefreshCw className="size-3" /> : <WifiOff className="size-3" />}
      {online ? `Sync ${pending}` : `Offline${pending ? ` · ${pending}` : ""}`}
    </button>
  );
}
