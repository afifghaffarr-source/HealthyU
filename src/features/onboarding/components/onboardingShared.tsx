import type { ActivityLevel } from "@/lib/health";
import { useState } from "react";
import { HelpCircle, ChevronDown } from "lucide-react";

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
  ["pescatarian", "Pescatarian"],
  ["halal", "Halal tradisional"],
  ["no_preference", "Tanpa preferensi"],
] as const;

export type Pace = "gentle" | "steady" | "ambitious";

// Calorie delta (negative = deficit for lose, positive = surplus for gain).
export function paceDelta(goal: "lose" | "maintain" | "gain", pace: Pace): number {
  if (goal === "maintain") return 0;
  const map: Record<Pace, number> = { gentle: 200, steady: 400, ambitious: 600 };
  const gainMap: Record<Pace, number> = { gentle: 150, steady: 300, ambitious: 500 };
  return goal === "lose" ? -map[pace] : gainMap[pace];
}

// Convert a calorie delta to estimated kg/week (≈7700 kcal/kg fat).
export function paceKgPerWeek(deltaKcal: number): number {
  return Math.round(((Math.abs(deltaKcal) * 7) / 7700) * 100) / 100;
}

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

export const primaryBtn = "bg-primary text-primary-foreground font-semibold py-4 rounded-2xl";
export const secondaryBtn = "bg-card outline-1 outline-black/10 font-semibold py-4 rounded-2xl";

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

/**
 * Inline disclosure: "Kenapa kami tanya ini?" → expands to a short, friendly
 * explanation. Helps onboarding transparency without crowding the layout.
 */
export function WhyAskDisclosure({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl bg-muted/40 dark:bg-muted/20 px-3 py-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full inline-flex items-center justify-between gap-2 text-[12px] font-medium text-muted-foreground hover:text-foreground transition"
      >
        <span className="inline-flex items-center gap-1.5">
          <HelpCircle className="size-3.5 text-primary" aria-hidden />
          Kenapa kami tanya ini?
        </span>
        <ChevronDown
          className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open && (
        <div className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">{children}</div>
      )}
    </div>
  );
}
