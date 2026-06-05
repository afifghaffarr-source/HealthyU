import { ScanItemCard } from "./ScanItemCard";

type Item = {
  name: string;
  calories: number;
  portion_g?: number | null;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  matched_food_id?: string | null;
};

export function ScanItemsList<T extends Item>({
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
  items: T[];
  originals: T[];
  editIdx: number | null;
  setEditIdx: (n: number | null) => void;
  onUpdate: (idx: number, patch: Partial<T>) => void;
  onLog: (it: T, idx: number) => void;
  onLogAll: () => void;
  onDone: () => void;
  logPending: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground">Terdeteksi</p>
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
          onUpdate={(patch) => onUpdate(i, patch as Partial<T>)}
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