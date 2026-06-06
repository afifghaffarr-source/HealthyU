import { MEAL_TYPES, type MealTypeValue } from "@/features/scan/lib/scanHelpers";

export function MealTypePicker({
  value,
  onChange,
}: {
  value: MealTypeValue;
  onChange: (v: MealTypeValue) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground mb-2">Jenis makan</p>
      <div className="grid grid-cols-4 gap-2">
        {MEAL_TYPES.map((m) => (
          <button
            key={m.v}
            onClick={() => onChange(m.v)}
            className={`py-2 rounded-xl text-xs font-medium border transition ${
              value === m.v
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/60 border-transparent text-muted-foreground"
            }`}
          >
            {m.l}
          </button>
        ))}
      </div>
    </div>
  );
}
