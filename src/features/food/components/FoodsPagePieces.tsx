import { Link } from "@tanstack/react-router";
import { X, Info } from "lucide-react";
import type { getFoodDetail } from "@/features/food/lib/foodDb.functions";

export function FacetSelect({
  label,
  value,
  setValue,
  options,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="w-16 text-muted-foreground font-medium">{label}</span>
      <select
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="flex-1 px-3 py-2 rounded-xl bg-muted/60 border border-transparent focus:border-primary outline-none text-sm"
      >
        <option value="">Semua</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

export type DetailData = Awaited<ReturnType<typeof getFoodDetail>> | undefined;

export function FoodDetailSheet({
  data,
  loading,
  onClose,
}: {
  data: DetailData;
  loading: boolean;
  onClose: () => void;
}) {
  const food = data?.food;
  const servings = data?.servings ?? [];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md bg-card rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg">{loading ? "Memuat..." : food?.name}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted" aria-label="Tutup">
            <X className="size-5" />
          </button>
        </div>
        {food && (
          <>
            <p className="text-xs text-muted-foreground mb-4">
              {food.region ?? "—"} · {food.category ?? "—"}
              {food.subcategory ? ` · ${food.subcategory}` : ""}
            </p>

            <div className="grid grid-cols-4 gap-2 mb-4">
              <Stat label="Kalori" value={Math.round(food.calories)} unit="kkal" />
              <Stat label="Protein" value={food.protein_g ?? 0} unit="g" />
              <Stat label="Karbo" value={food.carbs_g ?? 0} unit="g" />
              <Stat label="Lemak" value={food.fat_g ?? 0} unit="g" />
            </div>

            <div className="mb-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Ukuran Porsi</p>
              <div className="space-y-1.5">
                {servings.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Default: {food.serving_size}
                    {food.serving_unit}
                  </p>
                )}
                {servings.map((s) => (
                  <div
                    key={s.id}
                    className="flex justify-between text-sm px-3 py-2 rounded-lg bg-muted/50"
                  >
                    <span className="font-medium">{s.label}</span>
                    <span className="text-muted-foreground">
                      {s.grams}g ·{" "}
                      {Math.round((food.calories * Number(s.grams)) / Number(food.serving_size))}{" "}
                      kkal
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {(food.allergens?.length ?? 0) > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2">⚠️ Alergen</p>
                <div className="flex flex-wrap gap-1.5">
                  {food.allergens!.map((a: string) => (
                    <span
                      key={a}
                      className="text-xs px-2 py-1 rounded-full bg-destructive/10 text-destructive"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(food.tags?.length ?? 0) > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Tag</p>
                <div className="flex flex-wrap gap-1.5">
                  {food.tags!.map((t: string) => (
                    <span
                      key={t}
                      className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <Link
              to="/food"
              className="mt-2 flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
            >
              <Info className="size-4" /> Catat sebagai makanan
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: number | string; unit: string }) {
  return (
    <div className="text-center p-2 rounded-xl bg-muted/50">
      <p className="text-sm font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">
        {label} ({unit})
      </p>
    </div>
  );
}