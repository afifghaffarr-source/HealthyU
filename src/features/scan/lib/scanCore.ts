// Client-safe scan primitives. Imported by route components and feature
// components without leaking server-only code (Supabase admin client, AI
// gateway, rate limiter) into the browser bundle.
//
// Server-only scan helpers live in `scanCore.server.ts`.

export const MEAL_TYPES = [
  { v: "breakfast", l: "Sarapan" },
  { v: "lunch", l: "Makan Siang" },
  { v: "dinner", l: "Makan Malam" },
  { v: "snack", l: "Camilan" },
] as const;

export type MealTypeValue = (typeof MEAL_TYPES)[number]["v"];

export function pickDefaultMealType(): MealTypeValue {
  const h = new Date().getHours();
  if (h < 10) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 21) return "dinner";
  return "snack";
}

export { fileToDataUrl } from "@/lib/image-utils";
