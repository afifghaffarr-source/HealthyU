/**
 * Compute the next "suggested action" for the dashboard based on time
 * of day, meal count, water intake, and fasting state. The result is
 * a step pointing to a route + a short label/hint.
 *
 * Lives in a .ts file (not .tsx) so it doesn't trip the
 * `react-refresh/only-export-components` lint rule. The component
 * `SmartNextStepCard` lives in components/ and imports from here.
 *
 * Pure function — no React, no JSX — so unit-testable in isolation
 * if/when the project wants parametrized coverage (currently covered
 * via the component-level integration test in dashboard.tsx).
 */
import type { LucideIcon } from "lucide-react";
import { Camera, Droplets, Moon, Sparkles, Utensils } from "lucide-react";

export type NextStep = {
  to: string;
  label: string;
  hint: string;
  Icon: LucideIcon;
};

export function computeNextStep({
  hour,
  mealCount,
  waterMl,
  waterTarget,
  fastActive,
  remainingKcal,
}: {
  hour: number;
  mealCount: number;
  waterMl: number;
  waterTarget: number;
  fastActive: boolean;
  remainingKcal: number;
}): NextStep {
  if (fastActive && waterMl < waterTarget * 0.4) {
    return {
      to: "/water",
      label: "Minum air dulu",
      hint: "Hidrasi penting saat puasa",
      Icon: Droplets,
    };
  }
  if (hour >= 7 && hour < 11 && mealCount === 0 && !fastActive) {
    return {
      to: "/scan",
      label: "Catat sarapan",
      hint: "Scan foto atau cari manual",
      Icon: Camera,
    };
  }
  if (hour >= 11 && hour < 15 && mealCount < 2 && !fastActive) {
    return {
      to: "/scan",
      label: "Catat makan siang",
      hint: "Estimasi cepat dengan foto",
      Icon: Utensils,
    };
  }
  if (hour >= 17 && hour < 21 && mealCount < 3 && !fastActive && remainingKcal > 300) {
    return {
      to: "/scan",
      label: "Catat makan malam",
      hint: `Sisa ~${Math.round(remainingKcal)} kkal`,
      Icon: Utensils,
    };
  }
  if (waterMl < waterTarget * 0.5) {
    return {
      to: "/water",
      label: "Minum air segelas",
      hint: "Target hidrasi belum tercapai",
      Icon: Droplets,
    };
  }
  if (hour >= 21) {
    return {
      to: "/sleep",
      label: "Siapkan tidur",
      hint: "Catat jam tidur biar konsisten",
      Icon: Moon,
    };
  }
  return {
    to: "/recommendations",
    label: "Lihat rekomendasi",
    hint: "Ide menu personal dari AI",
    Icon: Sparkles,
  };
}
