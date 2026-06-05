export type ParsedHealth = {
  source: "apple_health" | "samsung_health";
  steps: { day: string; steps: number }[];
  weight: { logged_at: string; weight_kg: number }[];
  workouts: { performed_at: string; type: string; duration_min: number; calories_burned: number }[];
};

export function parseAppleHealthXml(xml: string): Omit<ParsedHealth, "source"> {
  const steps: Record<string, number> = {};
  const weight: { logged_at: string; weight_kg: number }[] = [];
  const workouts: {
    performed_at: string;
    type: string;
    duration_min: number;
    calories_burned: number;
  }[] = [];

  const recordRegex = /<Record\b[^>]*\/>/g;
  const attr = (s: string, name: string): string | null => {
    const m = s.match(new RegExp(`${name}="([^"]*)"`));
    return m ? m[1] : null;
  };
  for (const m of xml.match(recordRegex) ?? []) {
    const type = attr(m, "type");
    if (!type) continue;
    if (type === "HKQuantityTypeIdentifierStepCount") {
      const date = attr(m, "startDate")?.slice(0, 10);
      const val = Number(attr(m, "value"));
      if (date && Number.isFinite(val)) steps[date] = (steps[date] ?? 0) + val;
    } else if (type === "HKQuantityTypeIdentifierBodyMass") {
      const startDate = attr(m, "startDate");
      const unit = attr(m, "unit");
      let val = Number(attr(m, "value"));
      if (!Number.isFinite(val) || !startDate) continue;
      if (unit === "lb") val = val * 0.453592;
      weight.push({
        logged_at: new Date(startDate).toISOString(),
        weight_kg: Number(val.toFixed(2)),
      });
    }
  }

  const workoutRegex = /<Workout\b[^>]*\/?>(?:[\s\S]*?<\/Workout>)?/g;
  for (const m of xml.match(workoutRegex) ?? []) {
    const type = attr(m, "workoutActivityType")?.replace("HKWorkoutActivityType", "") ?? "Workout";
    const startDate = attr(m, "startDate");
    const dur = Number(attr(m, "duration"));
    const cal = Number(attr(m, "totalEnergyBurned") ?? "0");
    if (!startDate || !Number.isFinite(dur)) continue;
    workouts.push({
      performed_at: new Date(startDate).toISOString(),
      type,
      duration_min: Math.max(1, Math.round(dur)),
      calories_burned: Math.max(0, Math.round(Number.isFinite(cal) ? cal : 0)),
    });
  }

  return {
    steps: Object.entries(steps).map(([day, s]) => ({ day, steps: Math.round(s) })),
    weight,
    workouts,
  };
}

export function parseSamsungCsv(text: string, filename: string): Omit<ParsedHealth, "source"> {
  const lower = filename.toLowerCase();
  const lines = text.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith("//"));
  if (lines.length < 2) return { steps: [], weight: [], workouts: [] };
  const headerIdx = lines.findIndex((l) => l.includes(","));
  const header = lines[headerIdx].split(",").map((h) => h.trim().toLowerCase());
  const rows = lines.slice(headerIdx + 1).map((l) => l.split(","));
  const col = (name: string) => header.findIndex((h) => h.includes(name));

  if (lower.includes("step") || lower.includes("pedometer")) {
    const dateCol = col("date") >= 0 ? col("date") : col("day");
    const countCol = col("count") >= 0 ? col("count") : col("step");
    const out: Record<string, number> = {};
    for (const r of rows) {
      const day = (r[dateCol] ?? "").slice(0, 10);
      const val = Number(r[countCol]);
      if (day && Number.isFinite(val)) out[day] = (out[day] ?? 0) + val;
    }
    return {
      steps: Object.entries(out).map(([day, s]) => ({ day, steps: Math.round(s) })),
      weight: [],
      workouts: [],
    };
  }

  if (lower.includes("weight")) {
    const tCol = col("time") >= 0 ? col("time") : col("date");
    const wCol = col("weight");
    const out: { logged_at: string; weight_kg: number }[] = [];
    for (const r of rows) {
      const t = r[tCol];
      const w = Number(r[wCol]);
      if (t && Number.isFinite(w) && w > 20 && w < 400) {
        out.push({ logged_at: new Date(t).toISOString(), weight_kg: Number(w.toFixed(2)) });
      }
    }
    return { steps: [], weight: out, workouts: [] };
  }

  if (lower.includes("exercise") || lower.includes("workout")) {
    const tCol = col("start_time") >= 0 ? col("start_time") : col("time");
    const typeCol = col("type") >= 0 ? col("type") : col("exercise");
    const durCol = col("duration");
    const calCol = col("calorie");
    const out: {
      performed_at: string;
      type: string;
      duration_min: number;
      calories_burned: number;
    }[] = [];
    for (const r of rows) {
      const t = r[tCol];
      const type = r[typeCol] ?? "Exercise";
      const dur = Number(r[durCol]) / 60000;
      const cal = Number(r[calCol] ?? "0");
      if (t && Number.isFinite(dur) && dur >= 1) {
        out.push({
          performed_at: new Date(t).toISOString(),
          type: String(type).slice(0, 60),
          duration_min: Math.round(dur),
          calories_burned: Math.max(0, Math.round(Number.isFinite(cal) ? cal : 0)),
        });
      }
    }
    return { steps: [], weight: [], workouts: out };
  }

  return { steps: [], weight: [], workouts: [] };
}