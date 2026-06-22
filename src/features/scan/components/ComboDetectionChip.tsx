/**
 * Sprint W3: AI Warung Mode — Combo Detection Chip
 *
 * Auto-detect chip shown when scan detects Indonesian combo meal (nasi + lauk + ≥3 items).
 * User can dismiss or accept combo to save as grouped meal.
 *
 * Ref: docs/features/ai-warung-mode-spec.md section 3.5
 */

import { X } from "lucide-react";

type ComboDetectionChipProps = {
  comboName: string;
  totalCalories: number;
  onDismiss: () => void;
  className?: string;
};

export function ComboDetectionChip({
  comboName,
  totalCalories,
  onDismiss,
  className = "",
}: ComboDetectionChipProps) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl bg-primary/10 border border-primary/20 px-4 py-3 ${className}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-2xl">🍛</span>
        <div className="min-w-0">
          <div className="font-medium text-sm">{comboName} detected</div>
          <div className="text-xs text-muted-foreground">Total ~{totalCalories} kkal</div>
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 p-1.5 rounded-full hover:bg-primary/20 transition-colors"
        aria-label="Dismiss combo"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
