import { Check, Pencil } from "lucide-react";
import { recognizeFood } from "@/features/food/lib/foodScan.functions";
import { ConfidenceBadge } from "@/components/healthyu/confidence-badge";
import { tierFromScore } from "@/components/healthyu/confidence-badge.utils";

type Item = Awaited<ReturnType<typeof recognizeFood>>["items"][number];

function EditField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
        {label}
      </span>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-full text-sm bg-muted/60 rounded-lg px-2 py-1.5 outline-none focus:bg-background border border-transparent focus:border-primary"
      />
    </label>
  );
}

export function ScanItemCard({
  it,
  original,
  editing,
  onToggleEdit,
  onUpdate,
  onLog,
  logPending,
}: {
  it: Item;
  original: Item | undefined;
  editing: boolean;
  onToggleEdit: () => void;
  onUpdate: (patch: Partial<Item>) => void;
  onLog: () => void;
  logPending: boolean;
}) {
  const tier = tierFromScore(it.confidence);
  return (
    <div className="p-3 rounded-2xl bg-card border border-border/50 space-y-2">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              value={it.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              className="w-full text-sm font-semibold bg-muted/60 rounded-lg px-2 py-1 outline-none focus:bg-background border border-transparent focus:border-primary"
            />
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm truncate">{it.name}</p>
              <ConfidenceBadge score={it.confidence} />
            </div>
          )}
          {!editing && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {it.portion_g ? `~${it.portion_g}g` : it.portion_ml ? `~${it.portion_ml}ml` : ""}
              {" · "}P {Math.round(it.protein_g)}g · K {Math.round(it.carbs_g)}g · L{" "}
              {Math.round(it.fat_g)}g
            </p>
          )}
          {!editing && tier === "low" && (
            <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1 leading-snug">
              Mirip <b>{it.name}</b>? Konfirmasi dulu sebelum disimpan.
            </p>
          )}
          {it.matched_food_id && !editing && (
            <p className="text-[10px] text-primary mt-0.5">✓ ada di database</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="font-bold text-primary text-sm">{Math.round(it.calories)}</p>
          <p className="text-[10px] text-muted-foreground">kkal</p>
        </div>
        <button
          onClick={onToggleEdit}
          className="self-center size-8 rounded-lg bg-muted/60 grid place-items-center text-muted-foreground hover:text-foreground"
          aria-label={editing ? "Tutup edit" : "Edit"}
        >
          <Pencil className="size-3.5" />
        </button>
        <button
          onClick={onLog}
          disabled={logPending}
          className="self-center size-9 rounded-xl bg-primary text-primary-foreground grid place-items-center disabled:opacity-50"
          aria-label="Catat"
        >
          <Check className="size-4" />
        </button>
      </div>
      {editing && (
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="col-span-2 flex gap-1">
            {[0.5, 1, 1.5, 2].map((mult) => (
              <button
                key={mult}
                onClick={() => {
                  const o = original;
                  if (!o) return;
                  onUpdate({
                    portion_g: Math.round((o.portion_g ?? 0) * mult),
                    calories: Math.round(o.calories * mult),
                    protein_g: Number((o.protein_g * mult).toFixed(1)),
                    carbs_g: Number((o.carbs_g * mult).toFixed(1)),
                    fat_g: Number((o.fat_g * mult).toFixed(1)),
                  });
                }}
                className="flex-1 text-xs py-1 rounded-lg bg-muted hover:bg-primary/10"
              >
                {mult}×
              </button>
            ))}
          </div>
          <EditField
            label="Porsi (g)"
            value={it.portion_g ?? 0}
            onChange={(v) => onUpdate({ portion_g: v })}
          />
          <EditField
            label="Kalori"
            value={Math.round(it.calories)}
            onChange={(v) => onUpdate({ calories: v })}
          />
          <EditField
            label="Protein (g)"
            value={Math.round(it.protein_g)}
            onChange={(v) => onUpdate({ protein_g: v })}
          />
          <EditField
            label="Karbo (g)"
            value={Math.round(it.carbs_g)}
            onChange={(v) => onUpdate({ carbs_g: v })}
          />
          <EditField
            label="Lemak (g)"
            value={Math.round(it.fat_g)}
            onChange={(v) => onUpdate({ fat_g: v })}
          />
          <div className="col-span-2 text-[10px] text-muted-foreground pt-0.5">
            Koreksimu akan dikirim ke audit AI untuk perbaikan ke depan.
          </div>
        </div>
      )}
    </div>
  );
}
