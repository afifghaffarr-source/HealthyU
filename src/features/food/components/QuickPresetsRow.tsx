import { Zap } from "lucide-react";
import type { MealType } from "@/features/food/lib/foodHelpers";

type Preset = {
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

const PRESETS: Record<MealType, Preset[]> = {
  breakfast: [
    { name: "Roti + telur", calories: 280, protein_g: 14, carbs_g: 30, fat_g: 11 },
    { name: "Bubur ayam", calories: 350, protein_g: 15, carbs_g: 50, fat_g: 9 },
    { name: "Oatmeal + pisang", calories: 300, protein_g: 9, carbs_g: 55, fat_g: 5 },
    { name: "Nasi uduk", calories: 420, protein_g: 10, carbs_g: 60, fat_g: 15 },
  ],
  lunch: [
    { name: "Nasi ayam", calories: 550, protein_g: 30, carbs_g: 65, fat_g: 18 },
    { name: "Nasi padang (sedang)", calories: 700, protein_g: 25, carbs_g: 80, fat_g: 28 },
    { name: "Soto ayam + nasi", calories: 480, protein_g: 22, carbs_g: 55, fat_g: 16 },
    { name: "Gado-gado", calories: 420, protein_g: 15, carbs_g: 40, fat_g: 22 },
  ],
  dinner: [
    { name: "Nasi ikan bakar", calories: 500, protein_g: 28, carbs_g: 55, fat_g: 15 },
    { name: "Sup ayam + nasi", calories: 450, protein_g: 24, carbs_g: 55, fat_g: 12 },
    { name: "Mie ayam", calories: 520, protein_g: 18, carbs_g: 70, fat_g: 16 },
    { name: "Salad + ayam panggang", calories: 380, protein_g: 30, carbs_g: 20, fat_g: 18 },
  ],
  snack: [
    { name: "Pisang", calories: 105, protein_g: 1, carbs_g: 27, fat_g: 0 },
    { name: "Yogurt", calories: 120, protein_g: 7, carbs_g: 15, fat_g: 3 },
    { name: "Kacang almond (30g)", calories: 170, protein_g: 6, carbs_g: 6, fat_g: 15 },
    { name: "Telur rebus", calories: 78, protein_g: 6, carbs_g: 1, fat_g: 5 },
  ],
};

type LogPayload = {
  food_item_id: string | null;
  custom_name: string | null;
  meal_type: MealType;
  serving_qty: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export function QuickPresetsRow({
  mealType,
  onLog,
  disabled,
}: {
  mealType: MealType;
  onLog: (p: LogPayload) => void;
  disabled?: boolean;
}) {
  const items = PRESETS[mealType];
  return (
    <section className="bg-card p-4 rounded-3xl outline-1 outline-black/5 dark:outline-white/10 space-y-3">
      <div className="flex items-center gap-2">
        <div className="size-8 rounded-xl bg-primary/10 grid place-items-center text-primary">
          <Zap className="size-4" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-semibold">Tambah cepat</p>
          <p className="text-[11px] text-muted-foreground">
            Pilihan umum untuk {mealLabel(mealType)} — bisa kamu ubah setelah dicatat.
          </p>
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1 snap-x">
        {items.map((p) => (
          <button
            key={p.name}
            type="button"
            disabled={disabled}
            onClick={() =>
              onLog({
                food_item_id: null,
                custom_name: p.name,
                meal_type: mealType,
                serving_qty: 1,
                calories: p.calories,
                protein_g: p.protein_g,
                carbs_g: p.carbs_g,
                fat_g: p.fat_g,
              })
            }
            className="shrink-0 snap-start text-left rounded-2xl bg-muted/60 hover:bg-muted px-3 py-2.5 min-w-[140px] min-h-11 disabled:opacity-50"
          >
            <p className="text-[13px] font-semibold leading-tight">{p.name}</p>
            <p className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
              {p.calories} kkal · P{p.protein_g}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}

function mealLabel(t: MealType) {
  return { breakfast: "sarapan", lunch: "makan siang", dinner: "makan malam", snack: "camilan" }[t];
}