import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { logMeal } from "@/features/meals/lib/meals.functions";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

const MEAL_OPTIONS: Array<{ label: string; value: MealType }> = [
  { label: "Pagi", value: "breakfast" },
  { label: "Siang", value: "lunch" },
  { label: "Malam", value: "dinner" },
  { label: "Snack", value: "snack" },
];

export function QuickLogSheet({
  open,
  onOpenChange,
  defaultMealType = "snack",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMealType?: MealType;
}) {
  const [name, setName] = useState("");
  const [cal, setCal] = useState("");
  const [mealType, setMealType] = useState<MealType>(defaultMealType);
  const qc = useQueryClient();
  const logFn = useServerFn(logMeal);

  useEffect(() => {
    if (!open) {
      setName("");
      setCal("");
      setMealType(defaultMealType);
    }
  }, [defaultMealType, open]);

  const mut = useMutation({
    mutationFn: () =>
      logFn({
        data: {
          food_item_id: null,
          custom_name: name.trim() || "Snack cepat",
          meal_type: mealType,
          serving_qty: 1,
          calories: Number(cal || 0),
          protein_g: 0,
          carbs_g: 0,
          fat_g: 0,
        },
      }),
    onSuccess: () => {
      toast.success("Makanan tercatat");
      qc.invalidateQueries({ queryKey: ["meals", "today"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/50"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-md mx-auto rounded-t-3xl border border-border/60 bg-card p-5 space-y-3 animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto h-1.5 w-12 rounded-full bg-muted" />
        <div className="space-y-1">
          <h3 className="font-bold text-base">Log makanan cepat</h3>
          <p className="text-xs text-muted-foreground">
            Catat cepat sekarang, detail lain bisa kamu lengkapi nanti.
          </p>
        </div>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nama makanan (mis. Nasi goreng)"
          className="w-full rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm outline-none focus:border-primary"
        />

        <input
          value={cal}
          onChange={(e) => setCal(e.target.value)}
          type="number"
          inputMode="numeric"
          placeholder="Kalori (kkal)"
          className="w-full rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm outline-none focus:border-primary"
        />

        <div className="grid grid-cols-4 gap-2">
          {MEAL_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setMealType(option.value)}
              className={
                mealType === option.value
                  ? "min-h-10 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
                  : "min-h-10 rounded-xl border border-border/60 bg-background text-xs font-medium text-muted-foreground"
              }
            >
              {option.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => mut.mutate()}
          disabled={mut.isPending || !cal}
          className="w-full rounded-2xl bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-50"
        >
          {mut.isPending ? "Menyimpan…" : "Simpan cepat"}
        </button>
      </div>
    </div>
  );
}
