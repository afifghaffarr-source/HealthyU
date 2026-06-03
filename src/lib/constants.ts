// App-wide tunable constants.
//
// | Constant                       | What it controls                                          |
// | ------------------------------ | --------------------------------------------------------- |
// | TRENDING_TTL_DAYS              | Umur cache `recipes:trendingCount` sebelum di-invalidate. |
// | GROUP_BONUS_AGGREGATE_MS       | Window agregasi toast bonus klaim grup (debounce flush).  |
// | GROUP_BONUS_BADGE_TTL_MS       | Umur badge "+N klaim baru" sebelum auto-clear.            |
// | TRENDING_COUNTER_PULSE_MS      | Durasi pulse chip counter Trending saat angka bertambah.  |
// | TRENDING_GROWTH_FLASH_MS       | Durasi flash "+N" pada badge growth resep.                |
// | CHALLENGE_HIGHLIGHT_MS         | Durasi ring highlight kartu challenge (auto-scroll).      |
// | CHALLENGE_HIGHLIGHT_FADE_MS    | Lama fade-out ring di akhir CHALLENGE_HIGHLIGHT_MS.       |
//
// CONVENTION: setiap konstanta tunable WAJIB ditambahkan ke tabel di atas
// (nama + 1 baris efek). Reviewer boleh menolak PR yang menambah konstanta
// baru tanpa memperbarui tabel ini. Group constants by domain (challenges /
// trending / dashboard) lalu tambahkan dengan urutan deklarasi di bawah.

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