import { useState } from "react";
import { WifiOff, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

interface Props {
  online: boolean;
  pending: number;
  onSync: () => void;
  className?: string;
}

export function SyncPill({ online, pending, onSync, className }: Props) {
  const { t } = useTranslation();
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
        aria-label={online ? t("sync.pendingItems", { count: pending }) : t("sync.offlineMode")}
        className="inline-flex items-center gap-1"
      >
        {online ? <RefreshCw className="size-3" /> : <WifiOff className="size-3" />}
        {online
          ? t("sync.syncCount", { count: pending })
          : pending
            ? `${t("sync.offline")} · ${pending}`
            : t("sync.offline")}
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label={t("common.close")}
        className="inline-flex items-center text-current/50 hover:text-current"
      >
        <X className="size-3" />
      </button>
    </span>
  );
}
