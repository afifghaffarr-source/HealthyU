/** UI / dashboard timing & TTL constants. See `src/lib/constants.ts` (barrel) for full table. */
/** Hari sebelum localStorage `recipes:trendingCount` dianggap basi & di-invalidate. */

export const TRENDING_TTL_DAYS = 7;

/** Window agregasi toast bonus klaim grup (ms). */

export const GROUP_BONUS_AGGREGATE_MS = 5000;

/** Durasi badge "+N klaim baru" sebelum auto-clear (ms). */

export const GROUP_BONUS_BADGE_TTL_MS = 30000;

/** Durasi pulse chip counter Trending saat angka bertambah (ms). */

export const TRENDING_COUNTER_PULSE_MS = 1500;

/** Durasi flash "+N" pada badge growth resep (ms). */

export const TRENDING_GROWTH_FLASH_MS = 2500;

/** Durasi ring highlight kartu challenge setelah scroll otomatis (ms). */

export const CHALLENGE_HIGHLIGHT_MS = 2000;

/** Lama fade-out ring di akhir CHALLENGE_HIGHLIGHT_MS (ms). */

export const CHALLENGE_HIGHLIGHT_FADE_MS = 500;

/** Opacity kartu challenge di akhir fade ring (0..1). */

export const CHALLENGE_HIGHLIGHT_FADE_OPACITY = 0.9;

/** Durasi transisi spring (opacity & box-shadow) untuk ring highlight (ms). */

export const CHALLENGE_HIGHLIGHT_TRANSITION_MS = 700;

/** Interval tick re-render countdown badge bonus klaim (ms). */

export const GROUP_BONUS_BADGE_TICK_MS = 1000;
