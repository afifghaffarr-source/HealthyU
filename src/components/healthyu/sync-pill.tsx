import { useState } from "react";
import { WifiOff, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  online: boolean;
  pending: number;
  onSync: () => void;
  className?: string;
}

export function SyncPill({ online, pending, onSync, className }: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;
  if (online && pending === 0) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-full transition-colors",
        online ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground",
        className,
      )}
    >
      <button
        type="button"
        onClick={onSync}
        aria-label={online ? `Sync ${pending} item tertunda` : "Mode offline"}
        className="inline-flex items-center gap-1"
      >
        {online ? <RefreshCw className="size-3" /> : <WifiOff className="size-3" />}
        {online ? `Sync ${pending}` : `Offline${pending ? ` · ${pending}` : ""}`}
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Tutup"
        className="inline-flex items-center text-current/50 hover:text-current"
      >
        <X className="size-3" />
      </button>
    </span>
  );
}
