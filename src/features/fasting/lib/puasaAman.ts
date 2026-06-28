/**
 * Sprint 29 — Puasa Aman (safe-fasting) helper.
 *
 * Pure-mapping helper for the Puasa Aman widget. Produces:
 *   - buka-puasa countdown (HH:mm until iftar)
 *   - sahur reverse-countdown (HH:mm until imsak)
 *   - a priori-tised nudges (water / iftar-prep / midday-support / hydration-guard)
 *
 * Ponytail rationale: previously the dashboard adaptive-greeting reused
 * fixed copy. Sprint 29 adds per-axis nudges driven by actual log gaps
 * (water/meal elapsed hours). Same humane-tone lock as Sprint 25 —
 * Indonesian copy ONLY, never shame-language.
 */
export type NudgeKind =
  | "water"
  | "iftar-prep"
  | "midday-support"
  | "ramadhan-blessing"
  | "post-iftar";

export interface PuasaAmanNudge {
  kind: NudgeKind;
  copy: string; // Indonesian, ≤ 80 chars
  priority: number; // 1 = default, 2 = urgent
}

export interface PuasaAmanContext {
  nowIso: string;
  hour24: number;
  iftarHhmm: string; // "HH:mm"
  imsakHhmm: string; // "HH:mm"
  activeFast: boolean;
  elapsedHours: number;
  targetHours: number;
  lastWaterLogHoursAgo: number;
  lastMealHoursAgo: number;
  hoursActiveConsecutiveDays: number;
  inRamadhanMode: boolean;
}

export interface Countdown {
  minutesUntil: number;
  label: string;
}

function parseHhmm(s: string): { hours: number; minutes: number } | null {
  const m = /^(\d{1,2}):(\d{1,2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h < 0 || h > 23 || min < 0 || min > 59) {
    return null;
  }
  return { hours: h, minutes: min };
}

function fmtCountdown(minutes: number): string {
  if (minutes <= 0) return "sekarang";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h <= 0) return `${m}m lagi`;
  if (m <= 0) return `${h}j lagi`;
  return `${h}j ${m}m lagi`;
}

export function computeIftarCountdown(ctx: PuasaAmanContext): Countdown {
  if (!ctx.activeFast) {
    return { minutesUntil: 0, label: "tidak ada puasa aktif" };
  }
  const target = parseHhmm(ctx.iftarHhmm);
  if (!target) return { minutesUntil: 0, label: "iftar belum diatur" };
  // Minutes from now until today's target.
  const nowMinutes = ctx.hour24 >= 0 ? ctx.hour24 * 60 : 0;
  const targetMinutes = target.hours * 60 + target.minutes;
  let diff = targetMinutes - nowMinutes;
  if (diff < 0) {
    // Already past today's iftar. Treat as "berbuka sekarang" if within 1h past.
    if (Math.abs(diff) <= 60) return { minutesUntil: 0, label: "waktu berbuka — sekarang!" };
    // Past by more than an hour: schedule already over for the day.
    return { minutesUntil: 0, label: "iftar sudah lewat untuk hari ini" };
  }
  if (diff > 24 * 60) diff = 24 * 60;
  const label = `Berbuka pukul ${ctx.iftarHhmm} — ${fmtCountdown(diff)}`;
  return { minutesUntil: diff, label };
}

export function computeSahurCountdown(ctx: PuasaAmanContext): Countdown {
  const target = parseHhmm(ctx.imsakHhmm);
  if (!target) return { minutesUntil: 0, label: "imsak belum diatur" };
  const nowMinutes = ctx.hour24 >= 0 ? ctx.hour24 * 60 : 0;
  let diff = target.hours * 60 + target.minutes - nowMinutes;
  // If negative, treat as either pre-dawn tomorrow (+24h) or "lewat".
  if (diff < 0) {
    if (diff > -6 * 60) return { minutesUntil: 0, label: "imsak sudah lewat untuk hari ini" };
    // Pre-dawn: subtract so caller sees positive time-until-next-imsak.
    diff += 24 * 60;
  }
  const label =
    diff <= 0
      ? `Sahur berikutnya ${ctx.imsakHhmm}`
      : `Sahur ${ctx.imsakHhmm} — ${fmtCountdown(diff)}`;
  return { minutesUntil: diff, label };
}

export function pickSafeFastingNudge(ctx: PuasaAmanContext): PuasaAmanNudge {
  // ── Hydration guard (highest priority) ────────────────────────────
  if (ctx.activeFast && ctx.lastWaterLogHoursAgo >= 5) {
    return {
      kind: "water",
      priority: 2,
      copy: ctx.inRamadhanMode
        ? "Sudah 5 jam lebih tanpa air. Yuk buka dengan air hangat dulu — buka-puasa paling utama untuk tubuh."
        : "Tubuh perlu hidrasi. Minumlah beberapa teguk air perlahan.",
    };
  }
  if (ctx.activeFast && ctx.lastWaterLogHoursAgo >= 2.5) {
    return {
      kind: "water",
      priority: 1,
      copy: "Teguk air hangat sebentar — membantu menahan lapar dan mencegah pusing.",
    };
  }

  // ── Buka-puasa prep window (within 1.5h of iftar) ─────────────────
  if (ctx.activeFast && ctx.inRamadhanMode && ctx.hour24 >= 17) {
    const h = ctx.hour24;
    if (h >= 17 && h < 19) {
      return {
        kind: "iftar-prep",
        priority: 2,
        copy: "Hampir berbuka! Siapkan kurma, air putih, dan makanan utama bernutrisi terlebih dahulu.",
      };
    }
    if (h >= 19) {
      return {
        kind: "post-iftar",
        priority: 1,
        copy: "Alhamdulillah atas berbukanya. Lanjutkan dengan makanan utama, jangan terburu-buru ya.",
      };
    }
  }

  // ── Midday support (10:00–16:00, fasting) ────────────────────────
  if (ctx.activeFast && ctx.hour24 >= 10 && ctx.hour24 < 16) {
    return {
      kind: "midday-support",
      priority: 1,
      copy:
        ctx.elapsedHours >= ctx.targetHours - 2
          ? "Sebentar lagi berbuka — tetap tenang, tubuhmu lebih kuat dari yang kamu kira."
          : "Tetap semangat! Sibukkan diri dengan aktivitas ringan agar waktu cepat berlalu.",
    };
  }

  // ── Default blessing-based nudge with no fast active ────────────
  if (!ctx.activeFast) {
    return {
      kind: ctx.inRamadhanMode ? "ramadhan-blessing" : "midday-support",
      priority: 1,
      copy: ctx.inRamadhanMode
        ? "Bulan Ramadhan — tetap jaga hidrasi dan makanan bergizi di luar waktu puasa."
        : "Pola makan teratur adalah fondasi kesehatan jangka panjang.",
    };
  }

  // ── Default in fast fallback ─────────────────────────────────────
  return {
    kind: "midday-support",
    priority: 1,
    copy: "Jangan lupa cek hidrasi dan niatmu. Semangat ya!",
  };
}
