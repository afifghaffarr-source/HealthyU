import { Link } from "@tanstack/react-router";
import {
  X,
  Info,
  Sparkles,
  Wheat,
  Egg,
  Beef,
  Flame,
  Droplets,
  Pill,
  AlertTriangle,
  Leaf,
} from "lucide-react";
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

/* Glycemic index → label & color band */
function giLabel(gi: number | null | undefined): { text: string; tone: string } {
  if (gi == null) return { text: "—", tone: "bg-muted text-muted-foreground" };
  if (gi < 55)
    return { text: "Rendah", tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" };
  if (gi < 70)
    return { text: "Sedang", tone: "bg-amber-500/10 text-amber-700 dark:text-amber-400" };
  return { text: "Tinggi", tone: "bg-rose-500/10 text-rose-700 dark:text-rose-400" };
}

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
  const gi = giLabel(food?.glycemic_index);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md bg-card rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-1">
          <div className="min-w-0 flex-1 pr-2">
            <h2 className="font-bold text-lg leading-tight">
              {loading ? "Memuat..." : food?.name}
            </h2>
            {food?.name_en && food.name_en !== food.name && (
              <p className="text-xs text-muted-foreground mt-0.5">{food.name_en}</p>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted" aria-label="Tutup">
            <X className="size-5" />
          </button>
        </div>

        {food && (
          <>
            <p className="text-xs text-muted-foreground mb-3">
              {food.region ?? "—"} · {food.category ?? "—"}
              {food.subcategory ? ` · ${food.subcategory}` : ""}
              {food.cuisine ? ` · ${food.cuisine}` : ""}
            </p>

            {/* Dietary flags */}
            <FlagsRow
              halal={food.is_halal}
              vegetarian={food.is_vegetarian}
              vegan={food.is_vegan}
              glutenFree={food.is_gluten_free}
              keto={food.is_keto_friendly}
              diabetic={food.is_diabetic_friendly}
              verified={food.is_verified}
              className="mb-4"
            />

            {/* Macronutrient stat strip */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <Stat label="Kalori" value={Math.round(food.calories)} unit="kkal" />
              <Stat label="Protein" value={food.protein_g ?? 0} unit="g" />
              <Stat label="Karbo" value={food.carbs_g ?? 0} unit="g" />
              <Stat label="Lemak" value={food.fat_g ?? 0} unit="g" />
            </div>

            {/* Glycemic info — extra insight for diabetic users */}
            {(food.glycemic_index != null || food.glycemic_load != null) && (
              <section className="mb-4">
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Flame className="size-3.5" aria-hidden /> Indeks Glikemik
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted/40">
                    <div>
                      <p className="text-[10px] text-muted-foreground">GI</p>
                      <p className="text-sm font-bold">{food.glycemic_index ?? "—"}</p>
                    </div>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${gi.tone}`}>
                      {gi.text}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted/40">
                    <div>
                      <p className="text-[10px] text-muted-foreground">GL</p>
                      <p className="text-sm font-bold">{food.glycemic_load ?? "—"}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground px-1.5">per porsi</span>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">
                  GI &lt; 55 rendah, 55-69 sedang, ≥ 70 tinggi. GL ≥ 20 tinggi.
                </p>
              </section>
            )}

            {/* Micronutrients — fiber + sodium + sat_fat + cholesterol */}
            <section className="mb-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                <Pill className="size-3.5" aria-hidden /> Nutrisi Lain
              </p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                <NutriRow label="Serat" value={food.fiber_g} unit="g" />
                <NutriRow label="Gula" value={food.sugar_g} unit="g" />
                <NutriRow label="Lemak jenuh" value={food.sat_fat_g} unit="g" />
                <NutriRow label="Lemak trans" value={food.trans_fat_g} unit="g" />
                <NutriRow label="Natrium" value={food.sodium_mg} unit="mg" />
                <NutriRow label="Kolesterol" value={food.cholesterol_mg} unit="mg" />
              </div>
            </section>

            {/* Vitamins & minerals (compact, only if any > 0) */}
            {(Number(food.potassium_mg) > 0 ||
              Number(food.calcium_mg) > 0 ||
              Number(food.iron_mg) > 0 ||
              Number(food.vitamin_a_mcg) > 0 ||
              Number(food.vitamin_c_mg) > 0 ||
              Number(food.vitamin_d_mcg) > 0) && (
              <section className="mb-4">
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Sparkles className="size-3.5" aria-hidden /> Vitamin & Mineral
                </p>
                <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                  <MiniNutri label="Kalium" value={food.potassium_mg} unit="mg" />
                  <MiniNutri label="Kalsium" value={food.calcium_mg} unit="mg" />
                  <MiniNutri label="Zat besi" value={food.iron_mg} unit="mg" />
                  <MiniNutri label="Vit A" value={food.vitamin_a_mcg} unit="mcg" />
                  <MiniNutri label="Vit C" value={food.vitamin_c_mg} unit="mg" />
                  <MiniNutri label="Vit D" value={food.vitamin_d_mcg} unit="mcg" />
                </div>
              </section>
            )}

            {/* Serving sizes */}
            <section className="mb-4">
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
                    className="flex justify-between text-sm px-3 py-2 rounded-lg bg-muted/40"
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
            </section>

            {/* Description */}
            {food.description && (
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                {food.description}
              </p>
            )}

            {/* Ingredients — flatten JSONB array if present */}
            {Array.isArray(food.ingredients) && food.ingredients.length > 0 && (
              <section className="mb-4">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Bahan Utama</p>
                <p className="text-xs leading-relaxed">
                  {(food.ingredients as unknown[])
                    .slice(0, 8)
                    .map((ing) =>
                      typeof ing === "string"
                        ? ing
                        : ing && typeof ing === "object" && "name" in ing
                          ? String((ing as { name?: unknown }).name ?? "")
                          : "",
                    )
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </section>
            )}

            {/* Brand + BPOM + health rating meta row */}
            {(food.brand || food.bpom_number || food.health_rating != null) && (
              <section className="mb-4 pt-3 border-t border-border/50 space-y-1.5">
                {food.brand && <MetaRow label="Merek" value={food.brand} />}
                {food.bpom_number && (
                  <MetaRow
                    label="BPOM"
                    value={food.bpom_number}
                    tone="text-emerald-700 dark:text-emerald-400"
                  />
                )}
                {food.health_rating != null && food.health_rating > 0 && (
                  <MetaRow
                    label="Health Score"
                    value={`${food.health_rating}/10 ${
                      food.health_rating >= 8 ? "🟢" : food.health_rating >= 5 ? "🟡" : "🔴"
                    }`}
                  />
                )}
              </section>
            )}

            {/* Allergens */}
            {(food.allergens?.length ?? 0) > 0 && (
              <section className="mb-3">
                <p className="text-xs font-semibold text-destructive mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="size-3.5" aria-hidden /> Mengandung Alergen
                </p>
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
              </section>
            )}

            {/* Tags */}
            {(food.tags?.length ?? 0) > 0 && (
              <section className="mb-4">
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
              </section>
            )}

            {/* CTA */}
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

/* ── Sub-components ─────────────────────────────────────────────────────── */

function Stat({ label, value, unit }: { label: string; value: number | string; unit: string }) {
  return (
    <div className="text-center p-2 rounded-xl bg-muted/40">
      <p className="text-sm font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">
        {label} ({unit})
      </p>
    </div>
  );
}

function NutriRow({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | null | undefined;
  unit: string;
}) {
  if (value == null || Number(value) === 0) {
    return (
      <div className="flex justify-between">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">—</span>
      </div>
    );
  }
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">
        {Number(value).toFixed(value < 10 ? 1 : 0)} {unit}
      </span>
    </div>
  );
}

function MiniNutri({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | null | undefined;
  unit: string;
}) {
  if (value == null || Number(value) === 0) return null;
  return (
    <div className="px-2 py-1.5 rounded-md bg-muted/40 text-center">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="font-semibold">
        {Math.round(Number(value))}
        <span className="text-[10px] text-muted-foreground ml-0.5">{unit}</span>
      </p>
    </div>
  );
}

function MetaRow({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${tone ?? ""}`}>{value}</span>
    </div>
  );
}

function FlagsRow({
  halal,
  vegetarian,
  vegan,
  glutenFree,
  keto,
  diabetic,
  verified,
  className = "",
}: {
  halal?: boolean | null;
  vegetarian?: boolean | null;
  vegan?: boolean | null;
  glutenFree?: boolean | null;
  keto?: boolean | null;
  diabetic?: boolean | null;
  verified?: boolean | null;
  className?: string;
}) {
  const flags: { label: string; tone: string; icon?: React.ReactNode }[] = [];
  if (vegan) {
    flags.push({
      label: "Vegan",
      tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
      icon: <Leaf className="size-3" />,
    });
  } else if (vegetarian) {
    flags.push({
      label: "Vegetarian",
      tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
      icon: <Egg className="size-3" />,
    });
  }
  if (keto)
    flags.push({
      label: "Keto",
      tone: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
      icon: <Beef className="size-3" />,
    });
  if (glutenFree)
    flags.push({
      label: "Bebas Gluten",
      tone: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
      icon: <Wheat className="size-3" />,
    });
  if (diabetic)
    flags.push({
      label: "Ramah Diabet",
      tone: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
      icon: <Droplets className="size-3" />,
    });
  if (halal) flags.push({ label: "Halal", tone: "bg-primary/10 text-primary" });
  if (verified)
    flags.push({
      label: "Terverifikasi",
      tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    });

  if (flags.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {flags.map((f) => (
        <span
          key={f.label}
          className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full ${f.tone}`}
        >
          {f.icon}
          {f.label}
        </span>
      ))}
    </div>
  );
}

/* Inline icons imported at top — no extra declarations needed */
