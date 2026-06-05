export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export function labelMeal(t: MealType): string {
  return { breakfast: "Sarapan", lunch: "Makan Siang", dinner: "Makan Malam", snack: "Camilan" }[t];
}

export function currentMealType(): MealType {
  const h = new Date().getHours();
  if (h < 10) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 20) return "dinner";
  return "snack";
}