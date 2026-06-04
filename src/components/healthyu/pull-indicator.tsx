import { Loader2, ArrowDown } from "lucide-react";

interface Props {
  pulling: number;
  refreshing: boolean;
}

export function PullIndicator({ pulling, refreshing }: Props) {
  if (!pulling && !refreshing) return null;
  const visible = refreshing || pulling > 8;
  if (!visible) return null;
  return (
    <div
      className="fixed top-2 left-1/2 -translate-x-1/2 z-50 size-9 rounded-full bg-card shadow-lg grid place-items-center text-primary motion-reduce:transform-none"
      style={{ transform: `translate(-50%, ${Math.min(pulling, 60)}px)` }}
    >
      {refreshing ? <Loader2 className="size-4 animate-spin" /> : <ArrowDown className="size-4" />}
    </div>
  );
}
