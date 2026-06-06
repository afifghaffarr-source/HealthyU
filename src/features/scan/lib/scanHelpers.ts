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

export async function fileToDataUrl(file: File, maxSize = 1280): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.82);
}
