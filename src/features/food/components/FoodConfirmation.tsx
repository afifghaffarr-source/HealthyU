import { useState } from "react";
import { X, Check, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import type { NlParsedFoodItem } from "@/features/food/lib/aiFoodParser";
import { toast } from "@/lib/toast-config";
import { useTranslation } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n";

type FoodConfirmationProps = {
  items: NlParsedFoodItem[];
  rawInput: string;
  onConfirm: (items: NlParsedFoodItem[]) => void;
  onCancel: () => void;
  isPending?: boolean;
};

export function FoodConfirmation({
  items,
  rawInput,
  onConfirm,
  onCancel,
  isPending,
}: FoodConfirmationProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  if (items.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
        <div className="bg-card w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl p-6 space-y-4">
          <div className="text-center space-y-2">
            <AlertTriangle className="size-8 mx-auto text-amber-500" />
            <p className="font-semibold">{t("food.confirmEmpty")}</p>
            <p className="text-sm text-muted-foreground">{t("food.confirmEmptyHint")}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl"
          >
            {t("common.close")}
          </button>
        </div>
      </div>
    );
  }

  const totalCalories = items.reduce((s, i) => s + (i.calories || 0), 0);
  const totalProtein = items.reduce((s, i) => s + (i.protein_g || 0), 0);
  const totalCarbs = items.reduce((s, i) => s + (i.carbs_g || 0), 0);
  const totalFat = items.reduce((s, i) => s + (i.fat_g || 0), 0);

  const warnings = computeWarnings(items, t);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
      <div className="bg-card w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border/50 px-5 pt-5 pb-3 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg">{t("food.confirmTitle")}</h2>
            <button
              type="button"
              onClick={onCancel}
              className="size-8 rounded-full bg-muted grid place-items-center"
              aria-label={t("common.close")}
            >
              <X className="size-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("food.confirmSource")}{" "}
            <span className="font-medium text-foreground">"{rawInput}"</span>
          </p>
          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
            {t("food.confirmWarning")}
          </p>
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="px-5 pt-3">
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-xl p-3 space-y-1.5">
              {warnings.map((w, i) => (
                <p
                  key={i}
                  className="text-xs text-red-700 dark:text-red-300 flex items-start gap-1.5"
                >
                  <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />
                  {w}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Food Items */}
        <div className="px-5 pt-3 space-y-2">
          {items.map((item, idx) => (
            <FoodItemCard
              key={idx}
              item={item}
              idx={idx}
              expanded={expanded[idx] || false}
              onToggle={() => setExpanded((prev) => ({ ...prev, [idx]: !prev[idx] }))}
            />
          ))}
        </div>

        {/* Totals */}
        <div className="px-5 pt-4 pb-2">
          <div className="bg-muted/50 rounded-xl p-3">
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              {t("food.totalEstimate")}
            </p>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <p className="text-lg font-bold tabular-nums">{totalCalories}</p>
                <p className="text-[10px] text-muted-foreground">kkal</p>
              </div>
              <div>
                <p className="text-lg font-bold tabular-nums">{totalProtein}g</p>
                <p className="text-[10px] text-muted-foreground">Protein</p>
              </div>
              <div>
                <p className="text-lg font-bold tabular-nums">{totalCarbs}g</p>
                <p className="text-[10px] text-muted-foreground">Karbo</p>
              </div>
              <div>
                <p className="text-lg font-bold tabular-nums">{totalFat}g</p>
                <p className="text-[10px] text-muted-foreground">Lemak</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-card border-t border-border/50 px-5 py-4 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-muted text-foreground font-semibold py-3 rounded-xl"
            disabled={isPending}
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm(items);
              toast.success(t("food.savedN").replace("{n}", String(items.length)));
            }}
            disabled={isPending}
            className="flex-[2] bg-primary text-primary-foreground font-semibold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Check className="size-4" />
            {isPending ? t("food.savingN") : `${t("common.save")} ${items.length}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function FoodItemCard({
  item,
  idx,
  expanded,
  onToggle,
}: {
  item: NlParsedFoodItem;
  idx: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const confidenceBadge =
    item.confidence >= 0.8
      ? {
          label: t("food.confHigh"),
          color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
        }
      : item.confidence >= 0.5
        ? {
            label: t("food.confMed"),
            color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
          }
        : {
            label: t("food.confLow"),
            color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
          };

  return (
    <div className="bg-muted/40 rounded-xl overflow-hidden">
      {/* Summary row */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center gap-3 text-left"
      >
        <div className="size-9 rounded-lg bg-primary/10 grid place-items-center text-primary text-sm font-bold shrink-0">
          {idx + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{item.name}</p>
          <p className="text-xs text-muted-foreground">
            {item.portion_qty} {item.portion_unit}
            {item.portion_g ? ` (~${item.portion_g}g)` : ""} · {item.calories} kkal
          </p>
        </div>
        <span
          className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${confidenceBadge.color}`}
        >
          {confidenceBadge.label}
        </span>
        {expanded ? (
          <ChevronUp className="size-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-3 space-y-2 border-t border-border/30 pt-3">
          {/* Macros grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <MacroRow label={t("food.macroCalories")} value={`${item.calories} kkal`} />
            <MacroRow label={t("food.macroProtein")} value={`${item.protein_g}g`} />
            <MacroRow label={t("food.macroCarbs")} value={`${item.carbs_g}g`} />
            <MacroRow label={t("food.macroFat")} value={`${item.fat_g}g`} />
            <MacroRow label={t("food.macroSugar")} value={`${item.sugar_g}g`} />
            <MacroRow label={t("food.macroSodium")} value={`${item.sodium_mg}mg`} />
          </div>
          {item.notes && <p className="text-xs text-muted-foreground italic">📝 {item.notes}</p>}
          {item.matched_food_name && (
            <p className="text-[10px] text-green-600 dark:text-green-400 font-medium">
              ✅ {t("food.matchedDb")} {item.matched_food_name}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function MacroRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card rounded-lg px-2.5 py-1.5">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-semibold tabular-nums">{value}</p>
    </div>
  );
}

// ─── Warning logic ──────────────────────────────────────────────────────────

/**
 * Compute dietary warnings based on daily recommended limits.
 * Based on AKG (Angka Kecukupan Gizi) Indonesia.
 */
function computeWarnings(items: NlParsedFoodItem[], t: (k: TranslationKey) => string): string[] {
  const warnings: string[] = [];

  const totalSodium = items.reduce((s, i) => s + (i.sodium_mg || 0), 0);
  const totalSugar = items.reduce((s, i) => s + (i.sugar_g || 0), 0);
  const totalFat = items.reduce((s, i) => s + (i.fat_g || 0), 0);
  const totalCalories = items.reduce((s, i) => s + (i.calories || 0), 0);

  // Sodium: max 2000mg/hari (WHO), warn if single meal > 800mg
  if (totalSodium > 800) {
    const pct = Math.round((totalSodium / 2000) * 100);
    warnings.push(
      t("food.warnSodium").replace("{n}", String(totalSodium)).replace("{pct}", String(pct)),
    );
  }

  // Sugar: max 50g/hari (WHO), warn if single meal > 25g
  if (totalSugar > 25) {
    const pct = Math.round((totalSugar / 50) * 100);
    warnings.push(
      t("food.warnSugar").replace("{n}", String(totalSugar)).replace("{pct}", String(pct)),
    );
  }

  // Fat: max 65g/hari, warn if single meal > 30g
  if (totalFat > 30) {
    const pct = Math.round((totalFat / 65) * 100);
    warnings.push(t("food.warnFat").replace("{n}", String(totalFat)).replace("{pct}", String(pct)));
  }

  // Calories: warn if single meal > 1000 kcal
  if (totalCalories > 1000) {
    warnings.push(t("food.warnCalories").replace("{n}", String(totalCalories)));
  }

  return warnings;
}
