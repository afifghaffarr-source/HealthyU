/**
 * Sprint W3: AI Warung Mode — Post-Scan Portion Adjuster
 *
 * Allows user to adjust portion sizes with sliders after menu scan.
 * Shows verified TKPI nutrition when available, AI estimates as fallback.
 * Real-time calorie recalculation on slider change.
 *
 * Ref: docs/features/ai-warung-mode-spec.md section 3.4
 */

import { useState } from "react";
import { Badge } from "@/components/ui/badge";

type FoodItem = {
  name: string;
  description?: string;
  price?: number;
  est_calories?: number;
  est_protein_g?: number;
  est_carbs_g?: number;
  est_fat_g?: number;
  est_portion_g?: number;
  category?: string;
  food_item_id?: number;
  canonical_name?: string;
  source?: string;
  confidence_score?: number;
  verified_nutrition?: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
    serving_size: number;
    serving_unit: string;
    portion_label?: string | null;
  };
};

type AdjustedItem = FoodItem & {
  adjusted_portion_g: number;
  adjusted_calories: number;
};

type PostScanAdjusterProps = {
  items: FoodItem[];
  onSave: (adjustedItems: AdjustedItem[]) => void;
  onRescan: () => void;
  className?: string;
};

export function PostScanAdjuster({
  items,
  onSave,
  onRescan,
  className = "",
}: PostScanAdjusterProps) {
  // Initialize with AI estimates or verified portions
  const [adjustedItems, setAdjustedItems] = useState<AdjustedItem[]>(
    items.map((item) => {
      const initialPortion = item.est_portion_g || item.verified_nutrition?.serving_size || 100;
      const initialCalories = item.verified_nutrition
        ? item.verified_nutrition.calories
        : item.est_calories || 0;

      return {
        ...item,
        adjusted_portion_g: initialPortion,
        adjusted_calories: initialCalories,
      };
    }),
  );

  const handlePortionChange = (index: number, newPortionG: number) => {
    setAdjustedItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;

        // Recalculate calories based on new portion
        const baseCalories = item.verified_nutrition
          ? item.verified_nutrition.calories
          : item.est_calories || 0;
        const basePortion = item.verified_nutrition
          ? item.verified_nutrition.serving_size
          : item.est_portion_g || 100;

        const newCalories = Math.round((baseCalories / basePortion) * newPortionG);

        return {
          ...item,
          adjusted_portion_g: newPortionG,
          adjusted_calories: newCalories,
        };
      }),
    );
  };

  const totalCalories = adjustedItems.reduce((sum, item) => sum + item.adjusted_calories, 0);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Items list with sliders */}
      <div className="space-y-3">
        {adjustedItems.map((item, idx) => {
          const minPortion = 20; // minimum 20g
          const maxPortion = Math.max(300, (item.adjusted_portion_g || 100) * 2); // 2x initial or 300g
          const isVerified = !!item.verified_nutrition;

          return (
            <div key={idx} className="rounded-2xl bg-card border p-4 space-y-3">
              {/* Item header */}
              <div className="flex justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate flex items-center gap-2">
                    {item.canonical_name || item.name}
                    {isVerified && item.source && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {item.source}
                      </Badge>
                    )}
                  </div>
                  {item.description && (
                    <div className="text-xs text-muted-foreground line-clamp-1">
                      {item.description}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {item.price && (
                    <div className="text-xs font-semibold">
                      Rp{item.price.toLocaleString("id-ID")}
                    </div>
                  )}
                  <div className="text-sm font-bold text-primary">
                    {item.adjusted_calories} kkal
                  </div>
                </div>
              </div>

              {/* Portion adjuster */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Porsi: {item.adjusted_portion_g}g</span>
                  <span>
                    {minPortion}g - {maxPortion}g
                  </span>
                </div>
                <input
                  type="range"
                  min={minPortion}
                  max={maxPortion}
                  step={10}
                  value={item.adjusted_portion_g}
                  onChange={(e) => handlePortionChange(idx, Number(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0"
                />
                {item.verified_nutrition?.portion_label && (
                  <div className="text-[10px] text-muted-foreground">
                    Saran: {item.verified_nutrition.portion_label}
                  </div>
                )}
              </div>

              {/* Nutrition details (if verified) */}
              {isVerified && item.verified_nutrition && (
                <div className="flex gap-3 text-[10px] text-muted-foreground pt-1 border-t">
                  <span>
                    P:{" "}
                    {Math.round(
                      (item.verified_nutrition.protein_g / item.verified_nutrition.serving_size) *
                        item.adjusted_portion_g,
                    )}
                    g
                  </span>
                  <span>
                    K:{" "}
                    {Math.round(
                      (item.verified_nutrition.carbs_g / item.verified_nutrition.serving_size) *
                        item.adjusted_portion_g,
                    )}
                    g
                  </span>
                  <span>
                    L:{" "}
                    {Math.round(
                      (item.verified_nutrition.fat_g / item.verified_nutrition.serving_size) *
                        item.adjusted_portion_g,
                    )}
                    g
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Total + actions */}
      <div className="rounded-2xl bg-card border p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="font-semibold">Total Estimasi</span>
          <span className="text-2xl font-bold text-primary">{totalCalories} kkal</span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onSave(adjustedItems)}
            className="flex-1 py-3 px-4 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            Simpan ke Log
          </button>
          <button
            type="button"
            onClick={onRescan}
            className="py-3 px-4 rounded-xl border font-medium hover:bg-accent transition-colors"
          >
            Scan Ulang
          </button>
        </div>
      </div>
    </div>
  );
}
