type WeeklyData = {
  meals: Array<{ logged_at: string | Date; calories: number | string | null }>;
  water: Array<{ logged_at: string | Date; amount_ml: number | null }>;
  workouts: Array<{ performed_at: string | Date; calories_burned: number | null }>;
  sleep: Array<{ sleep_start: string; sleep_end: string }>;
  fasting: Array<{ completed: boolean | null }>;
};

function dayKey(d: string | Date) {
  return new Date(d).toISOString().slice(0, 10);
}

export function buildWeeklySummary(data: WeeklyData | undefined) {
  if (!data) return null;
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
  const byDay = days.map((day) => {
    const cals = data.meals
      .filter((m) => dayKey(m.logged_at) === day)
      .reduce((s, m) => s + Number(m.calories || 0), 0);
    const ml = data.water
      .filter((w) => dayKey(w.logged_at) === day)
      .reduce((s, w) => s + (w.amount_ml || 0), 0);
    const burn = data.workouts
      .filter((w) => dayKey(w.performed_at) === day)
      .reduce((s, w) => s + (w.calories_burned || 0), 0);
    const slept = data.sleep.filter((s) => dayKey(s.sleep_end) === day);
    const hours = slept.reduce(
      (s, x) =>
        s + (new Date(x.sleep_end).getTime() - new Date(x.sleep_start).getTime()) / 3600000,
      0,
    );
    return { day, cals, ml, burn, hours };
  });
  const totals = byDay.reduce(
    (a, b) => ({
      cals: a.cals + b.cals,
      ml: a.ml + b.ml,
      burn: a.burn + b.burn,
      hours: a.hours + b.hours,
    }),
    { cals: 0, ml: 0, burn: 0, hours: 0 },
  );
  const fastingDone = data.fasting.filter((f) => f.completed).length;
  return {
    byDay,
    totals,
    fastingDone,
    workoutCount: data.workouts.length,
    sleepCount: data.sleep.length,
  };
}