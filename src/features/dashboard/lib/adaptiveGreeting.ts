/**
 * Adaptive dashboard greeting in Indonesian.
 *
 * Considers time of day + streak milestone to provide a personalized,
 * encouraging greeting. Used by DashboardGreeting component.
 *
 * Lives in a .ts file (not .tsx) so it doesn't trip the
 * `react-refresh/only-export-components` lint rule.
 */

export type GreetingContext = {
  hour?: number;
  streak?: number;
  hasActiveFast?: boolean;
  mealsToday?: number;
};

export type Greeting = {
  /** Small caps label above the name */
  eyebrow: string;
  /** Main greeting line */
  primary: string;
  /** Optional second line — context-aware motivation */
  secondary: string;
  /** Emoji or icon hint — used by component for visual flair */
  mood: "neutral" | "warm" | "celebrate" | "fire" | "moon";
};

/**
 * Generate an adaptive greeting.
 *
 * Priority:
 *  1. Streak milestone (7/14/30/50/100/365) → celebrate
 *  2. Active fast → warm + supportive
 *  3. Empty log today → gentle prompt
 *  4. Time of day → default warm greeting
 */
export function adaptiveGreeting(ctx: GreetingContext = {}): Greeting {
  const h = ctx.hour ?? new Date().getHours();
  const streak = ctx.streak ?? 0;
  const hasFast = ctx.hasActiveFast ?? false;
  const meals = ctx.mealsToday ?? 0;

  // ── Streak milestones (overrides everything) ───────────────────────
  if (streak >= 365) {
    return {
      eyebrow: "Pencapaian Luar Biasa",
      primary: "365+ hari konsisten! 🌟",
      secondary: `Sudah setahun lebih kamu merawat tubuh. Terus lanjutkan!`,
      mood: "celebrate",
    };
  }
  if (streak >= 100) {
    return {
      eyebrow: `${streak} Hari Streak`,
      primary: "Tiga digit streak! 🔥",
      secondary: "100+ hari berturut-turut. Kamu di top 1% pengguna.",
      mood: "fire",
    };
  }
  if (streak >= 30) {
    return {
      eyebrow: `${streak} Hari Streak`,
      primary: "Bulan penuh konsistensi!",
      secondary: "30 hari berturut-turut — kebiasaan mulai jadi karakter.",
      mood: "fire",
    };
  }
  if (streak >= 14) {
    return {
      eyebrow: `${streak} Hari Streak`,
      primary: "2 minggu berturut-turut! 🌱",
      secondary: "Pertumbuhan terlihat. Jangan istirahat terlalu lama ya.",
      mood: "warm",
    };
  }
  if (streak >= 7) {
    return {
      eyebrow: `${streak} Hari Streak`,
      primary: "Satu minggu penuh!",
      secondary: "Streak 7 hari — kamu sudah mulai konsisten.",
      mood: "warm",
    };
  }

  // ── Active fast (override time-of-day) ────────────────────────────
  if (hasFast) {
    if (h < 12) {
      return {
        eyebrow: "Puasa Berjalan",
        primary: "Selamat pagi, pejuang sehat!",
        secondary: "Puasa kamu masih berjalan. Jangan lupa minum air ya.",
        mood: "warm",
      };
    }
    if (h >= 17) {
      return {
        eyebrow: "Puasa Berjalan",
        primary: "Hampir waktunya berbuka!",
        secondary: "Siapkan makanan ringan & bergizi untuk berbuka.",
        mood: "moon",
      };
    }
    return {
      eyebrow: "Puasa Berjalan",
      primary: "Tetap semangat!",
      secondary: "Puasa masih on. Kalau lapar, minum air hangat dulu.",
      mood: "warm",
    };
  }

  // ── No meals logged yet today (gentle nudge) ──────────────────────
  if (meals === 0) {
    if (h < 11) {
      return {
        eyebrow: "Selamat Pagi",
        primary: "Mulai hari dengan sarapan",
        secondary: "Catat sarapan pertama kamu hari ini. Bisa ringan dulu.",
        mood: "warm",
      };
    }
    if (h < 15) {
      return {
        eyebrow: "Selamat Siang",
        primary: "Belum ada catatan hari ini",
        secondary: "Yuk catat satu makanan dulu. Apapun itu, yang penting mulai.",
        mood: "neutral",
      };
    }
    if (h < 18) {
      return {
        eyebrow: "Selamat Sore",
        primary: "Sore ini, sempatkan makan",
        secondary: "Belum ada catatan hari ini. Pilih menu ringan & bergizi.",
        mood: "neutral",
      };
    }
    return {
      eyebrow: "Selamat Malam",
      primary: "Jangan skip makan malam",
      secondary: "Pilih protein + sayur. Besok pagi akan terasa lebih ringan.",
      mood: "moon",
    };
  }

  // ── Default time-of-day greeting ──────────────────────────────────
  if (h < 11) {
    return {
      eyebrow: "Selamat Pagi",
      primary: "Pagi yang sehat!",
      secondary: "Hari baru, kesempatan baru untuk merawat tubuh.",
      mood: "warm",
    };
  }
  if (h < 15) {
    return {
      eyebrow: "Selamat Siang",
      primary: "Siang yang produktif!",
      secondary: "Jangan lupa makan siang ya. Tubuh butuh bahan bakar.",
      mood: "warm",
    };
  }
  if (h < 18) {
    return {
      eyebrow: "Selamat Sore",
      primary: "Sore yang menyenangkan!",
      secondary: "Snack sehat sore ini? Buah atau kacang bisa jadi pilihan.",
      mood: "warm",
    };
  }
  return {
    eyebrow: "Selamat Malam",
    primary: "Malam yang tenang!",
    secondary: "Sudah makan malam? Jangan lupa catat biar target tetap terkontrol.",
    mood: "moon",
  };
}
