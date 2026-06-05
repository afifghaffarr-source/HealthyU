import { Minus, Plus, ShoppingBasket, Trash2 } from "lucide-react";
import { labelMeal, type MealType } from "@/features/food/lib/foodHelpers";

export type BasketItem = {
  key: string;
  food_item_id: string | null;
  food_name: string;
  serving_qty: number;
  serving_unit: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export function MealBasket({
  basket,
  mealType,
  totalCalories,
  isSubmitting,
  onUpdateQty,
  onRemove,
  onSubmit,
}: {
  basket: BasketItem[];
  mealType: MealType;
  totalCalories: number;
  isSubmitting: boolean;
  onUpdateQty: (key: string, delta: number) => void;
  onRemove: (key: string) => void;
  onSubmit: () => void;
}) {
  if (basket.length === 0) return null;
  return (
    <section className="bg-card p-4 rounded-3xl outline-1 outline-black/5 space-y-3 animate-fade-up">
      <div className="flex items-center gap-2">
        <ShoppingBasket className="size-4 text-primary" />
        <h2 className="font-bold text-sm">Keranjang ({basket.length})</h2>
        <span className="ml-auto text-sm font-bold tabular-nums">
          {Math.round(totalCalories)} kcal
        </span>
      </div>
      <div className="space-y-2">
        {basket.map((b) => (
          <div key={b.key} className="flex items-center gap-2 bg-muted/40 rounded-xl px-3 py-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{b.food_name}</p>
              <p className="text-[11px] text-muted-foreground tabular-nums">
                {Math.round(b.calories * b.serving_qty)} kcal · P
                {(b.protein_g * b.serving_qty).toFixed(0)} K
                {(b.carbs_g * b.serving_qty).toFixed(0)} L
                {(b.fat_g * b.serving_qty).toFixed(0)}
              </p>
            </div>
            <button
              onClick={() => onUpdateQty(b.key, -0.5)}
              className="size-7 rounded-full bg-background grid place-items-center"
            >
              <Minus className="size-3" />
            </button>
            <span className="w-8 text-center text-xs font-bold tabular-nums">
              {b.serving_qty}x
            </span>
            <button
              onClick={() => onUpdateQty(b.key, 0.5)}
              className="size-7 rounded-full bg-background grid place-items-center"
            >
              <Plus className="size-3" />
            </button>
            <button
              onClick={() => onRemove(b.key)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={onSubmit}
        disabled={isSubmitting}
        className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-2xl disabled:opacity-50"
      >
        Catat semua sebagai {labelMeal(mealType).toLowerCase()}
      </button>
    </section>
  );
}