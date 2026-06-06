export function bpCategory(sys?: number | null, dia?: number | null) {
  if (!sys || !dia) return null;
  if (sys < 90 || dia < 60) return { label: "Rendah", color: "text-sky-600" };
  if (sys < 120 && dia < 80) return { label: "Normal", color: "text-emerald-600" };
  if (sys < 130 && dia < 80) return { label: "Tinggi", color: "text-amber-600" };
  if (sys < 140 || dia < 90) return { label: "Hipertensi 1", color: "text-orange-600" };
  return { label: "Hipertensi 2", color: "text-red-600" };
}

export function glucoseCategory(mg?: number | null, state?: string | null) {
  if (!mg) return null;
  if (state === "fasting") {
    if (mg < 70) return { label: "Hipoglikemia", color: "text-red-600" };
    if (mg < 100) return { label: "Normal", color: "text-emerald-600" };
    if (mg < 126) return { label: "Pra-diabetes", color: "text-amber-600" };
    return { label: "Diabetes", color: "text-red-600" };
  }
  if (state === "post_meal") {
    if (mg < 140) return { label: "Normal", color: "text-emerald-600" };
    if (mg < 200) return { label: "Pra-diabetes", color: "text-amber-600" };
    return { label: "Diabetes", color: "text-red-600" };
  }
  return null;
}
