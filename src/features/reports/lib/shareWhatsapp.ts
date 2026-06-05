type Summary = {
  totals: { cals: number; ml: number; burn: number; hours: number };
  workoutCount: number;
  fastingDone: number;
};

export function shareWeeklyToWhatsapp(args: {
  summary: Summary | null;
  aiReport?: string | null;
  override?: { text: string; periodStart?: string; periodEnd?: string };
}) {
  const { summary, aiReport, override } = args;
  if (!summary && !override) return;
  if (override) {
    const header =
      `📊 *Laporan HealthyU* ${override.periodStart ?? ""} → ${override.periodEnd ?? ""}`.trim();
    const body = override.text;
    const text = [
      header,
      "",
      body ? `_${body.slice(0, 600)}${body.length > 600 ? "…" : ""}_` : "",
      "— dikirim dari HealthyU",
    ]
      .filter(Boolean)
      .join("\n");
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
    return;
  }
  const s = summary!;
  const lines = [
    "📊 *Laporan HealthyU 7 Hari*",
    "",
    `🍽️ Total kalori masuk: ${Math.round(s.totals.cals)} kcal`,
    `🔥 Kalori terbakar: ${s.totals.burn} kcal`,
    `💧 Total air: ${(s.totals.ml / 1000).toFixed(1)} L`,
    `😴 Total tidur: ${s.totals.hours.toFixed(1)} jam`,
    `🏃 Latihan: ${s.workoutCount} sesi`,
    `⏱️ Puasa selesai: ${s.fastingDone} sesi`,
    "",
    aiReport ? `_${aiReport.slice(0, 400)}${aiReport.length > 400 ? "…" : ""}_` : "",
    "— dikirim dari HealthyU",
  ]
    .filter(Boolean)
    .join("\n");
  window.open(
    `https://wa.me/?text=${encodeURIComponent(lines)}`,
    "_blank",
    "noopener,noreferrer",
  );
}