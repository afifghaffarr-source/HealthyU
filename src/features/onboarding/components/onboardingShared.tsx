import type { ActivityLevel } from "@/lib/health";

export type Goal = "lose" | "maintain" | "gain";

export const HEALTH_CONDITIONS = [
  "Diabetes",
  "Hipertensi",
  "Kolesterol tinggi",
  "Asam lambung / GERD",
  "Asam urat",
  "PCOS",
  "Tiroid",
  "Penyakit jantung",
] as const;

export const ALLERGIES = [
  "Kacang",
  "Susu / laktosa",
  "Telur",
  "Gluten",
  "Seafood",
  "Kedelai",
  "Ikan",
  "Wijen",
] as const;

export const DIETARY = [
  ["balanced", "Seimbang"],
  ["high_protein", "Tinggi protein"],
  ["low_carb", "Rendah karbo"],
  ["vegetarian", "Vegetarian"],
  ["vegan", "Vegan"],
  ["halal", "Halal tradisional"],
] as const;

export type OnboardingForm = {
  full_name: string;
  gender: "male" | "female";
  birth_date: string;
  height_cm: number;
  weight_kg: number;
  target_weight_kg: number;
  activity_level: ActivityLevel;
  dietary_preference: string;
  city: string;
  allergies: string[];
  health_conditions: string[];
};

export const primaryBtn =
  "bg-primary text-primary-foreground font-semibold py-4 rounded-2xl";
export const secondaryBtn =
  "bg-card outline-1 outline-black/10 font-semibold py-4 rounded-2xl";

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 w-full bg-card outline-1 outline-black/10 rounded-2xl px-4 py-3.5 tabular-nums"
      />
    </label>
  );
}