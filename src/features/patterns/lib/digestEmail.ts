/**
 * Weekly Pattern Digest — reusable email renderers
 *
 * Extracted from src/routes/api/sendWeeklyDigests.ts so both the cron path
 * (existing) and the on-demand user path (Sprint 18) can share one render.
 *
 * ponytail: render functions are pure (no DB / no env). Reused in 2 callers.
 */

export interface DigestPattern {
  type: string;
  explanation: string;
}

export function renderDigestHTML(patterns: DigestPattern[]): string {
  const rows = patterns
    .map(
      (p, i) => `
    <tr>
      <td style="padding:12px; border-bottom:1px solid #e5e7eb;">
        <strong>${i + 1}. ${formatDigestType(p.type)}</strong><br/>
        <span style="color:#6b7280; font-size:14px;">${p.explanation.slice(0, 100)}...</span>
      </td>
    </tr>
  `,
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#1f2937;max-width:600px;margin:0 auto;padding:20px">
  <div style="background:#f9fafb;border-radius:8px;padding:24px;margin-bottom:20px">
    <h1 style="margin:0 0 8px;color:#059669">📊 Ringkasan Mingguan</h1>
    <p style="margin:0;color:#6b7280">Pola makan 7 hari terakhir</p>
  </div>
  <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
    ${rows}
  </table>
  <div style="margin-top:24px;text-align:center">
    <a href="https://healthyu.web.id/profile/insights" style="display:inline-block;background:#059669;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:500">
      Lihat Detail
    </a>
  </div>
  <p style="margin-top:32px;font-size:12px;color:#9ca3af;text-align:center">
    HealthyU • <a href="https://healthyu.web.id" style="color:#059669">healthyu.web.id</a>
  </p>
</body>
</html>`.trim();
}

export function renderDigestText(patterns: DigestPattern[]): string {
  const lines = patterns.map(
    (p, i) => `${i + 1}. ${formatDigestType(p.type)}\n   ${p.explanation.slice(0, 80)}...`,
  );
  return `
📊 Ringkasan Pola Makan Mingguan

${lines.join("\n\n")}

Lihat detail: https://healthyu.web.id/profile/insights

---
HealthyU • healthyu.web.id`.trim();
}

function formatDigestType(type: string): string {
  const map: Record<string, string> = {
    skip_breakfast: "Sering Skip Sarapan",
    late_night_eating: "Makan Malam Larut",
    irregular_meals: "Jadwal Tidak Teratur",
    stress_eating: "Makan Saat Stres",
    sugar_crashes: "Konsumsi Gula Berlebih",
    night_cravings: "Ngidam Malam Hari",
    busy_day_skips: "Skip Makan Saat Sibuk",
  };
  return map[type] || type.replace(/_/g, " ");
}
