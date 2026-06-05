import { Loader2, Mic, MicOff, Search } from "lucide-react";

export function FoodSearchBar({
  q,
  setQ,
  listening,
  parsing,
  onVoice,
}: {
  q: string;
  setQ: (v: string) => void;
  listening: boolean;
  parsing: boolean;
  onVoice: () => void;
}) {
  return (
    <>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari makanan (nasi goreng, ayam bakar...)"
          className="w-full pl-11 pr-14 py-3.5 bg-card outline-1 outline-black/10 rounded-2xl text-sm"
        />
        <button
          type="button"
          onClick={onVoice}
          disabled={listening || parsing}
          title="Catat dengan suara"
          className={`absolute right-2 top-1/2 -translate-y-1/2 size-9 rounded-xl grid place-items-center transition ${listening ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-primary text-primary-foreground"}`}
        >
          {parsing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : listening ? (
            <MicOff className="size-4" />
          ) : (
            <Mic className="size-4" />
          )}
        </button>
      </div>
      {(listening || parsing) && (
        <p className="text-xs text-muted-foreground -mt-3">
          {listening ? "🎤 Mendengarkan... ucapkan makanan Anda" : "🤖 Memproses dengan AI..."}
        </p>
      )}
    </>
  );
}

export function MealTypeTabs({
  mealType,
  setMealType,
  labelMeal,
}: {
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  setMealType: (t: "breakfast" | "lunch" | "dinner" | "snack") => void;
  labelMeal: (t: "breakfast" | "lunch" | "dinner" | "snack") => string;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5">
      {(["breakfast", "lunch", "dinner", "snack"] as const).map((t) => (
        <button
          key={t}
          onClick={() => setMealType(t)}
          className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition ${mealType === t ? "bg-primary text-primary-foreground" : "bg-card outline-1 outline-black/10"}`}
        >
          {labelMeal(t)}
        </button>
      ))}
    </div>
  );
}