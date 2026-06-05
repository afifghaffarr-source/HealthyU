import { ScanItemCard } from "./ScanItemCard";
import { SafetyChip } from "@/components/healthyu/safety-chip";
import type { recognizeFood } from "@/features/food/lib/foodScan.functions";

type Item = Awaited<ReturnType<typeof recognizeFood>>["items"][number];

export function ScanItemsList({
  items,
  originals,
  editIdx,
  setEditIdx,
  onUpdate,
  onLog,
  onLogAll,
  onDone,
  logPending,
}: {
  items: Item[];
  originals: Item[];
  editIdx: number | null;
  setEditIdx: (n: number | null) => void;
  onUpdate: (idx: number, patch: Partial<Item>) => void;
  onLog: (it: Item, idx: number) => void;
  onLogAll: () => void;
  onDone: () => void;
  logPending: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs font-semibold text-muted-foreground">Terdeteksi</p>
        <SafetyChip variant="ai-estimate" />
      </div>
      <button
        onClick={onLogAll}
        disabled={logPending}
        className="w-full py-2 rounded-xl bg-primary/10 text-primary font-semibold text-xs disabled:opacity-50"
      >
        Catat semua ({items.length})
      </button>
      {items.map((it, i) => (
        <ScanItemCard
          key={i}
          it={it}
          original={originals[i]}
          editing={editIdx === i}
          onToggleEdit={() => setEditIdx(editIdx === i ? null : i)}
          onUpdate={(patch) => onUpdate(i, patch)}
          onLog={() => onLog(it, i)}
          logPending={logPending}
        />
      ))}
      <button
        onClick={onDone}
        className="w-full py-2 text-xs font-semibold text-primary"
      >
        Selesai
      </button>
    </div>
  );
}