import { Plus, Sparkles } from "lucide-react";

type Food = {
  id: string;
  name: string;
  serving_size?: number | string | null;
  serving_unit?: string | null;
  calories: number | string;
  protein_g?: number | string | null;
  carbs_g?: number | string | null;
  fat_g?: number | string | null;
};

export function FoodSearchResult({
  f,
  onShowAlternatives,
  onAddToBasket,
  onLog,
}: {
  f: Food;
  onShowAlternatives: () => void;
  onAddToBasket: () => void;
  onLog: () => void;
}) {
  return (
    <div className="w-full text-left bg-card p-3 rounded-2xl outline-1 outline-black/5 flex items-center gap-3">
      <div className="size-12 rounded-xl bg-mint grid place-items-center text-lg">🍽️</div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{f.name}</p>
        <p className="text-[11px] text-muted-foreground">
          {Math.round(Number(f.calories))} kcal · {f.serving_size}
          {f.serving_unit}
        </p>
      </div>
      <button
        onClick={onShowAlternatives}
        className="size-9 rounded-full bg-mint/60 text-emerald-700 grid place-items-center hover:bg-mint"
        aria-label="Lihat pengganti sehat"
        title="Saran pengganti sehat"
      >
        <Sparkles className="size-4" />
      </button>
      <button
        onClick={onAddToBasket}
        className="size-9 rounded-full bg-primary/10 text-primary grid place-items-center hover:bg-primary/20"
        aria-label="Tambah ke keranjang"
      >
        <Plus className="size-4" />
      </button>
      <button onClick={onLog} className="text-primary text-xs font-bold">
        Catat
      </button>
    </div>
  );
}