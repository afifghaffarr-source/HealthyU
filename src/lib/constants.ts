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
// | CHALLENGE_HIGHLIGHT_FADE_OPACITY | Opacity kartu di akhir fade ring highlight (0..1).      |
// | CHALLENGE_HIGHLIGHT_TRANSITION_MS | Durasi transisi spring opacity+ring highlight (ms).    |
// | GROUP_BONUS_BADGE_TICK_MS      | Interval re-render countdown badge "+N klaim baru" (ms).  |
// | PDF_PAGE_FOOTER_Y              | Y koordinat baris footer halaman A4 (pt).                |
// | PDF_MARGIN_X                   | Margin kiri (juga basis kanan = 595 - margin) PDF (pt).  |
// | PDF_PAGE_W                     | Lebar halaman A4 PDF (pt, jsPDF).                        |
// | PDF_PAGE_H                     | Tinggi halaman A4 PDF (pt, jsPDF).                       |
//
// CONVENTION: setiap konstanta tunable WAJIB ditambahkan ke tabel di atas
// (nama + 1 baris efek). Reviewer boleh menolak PR yang menambah konstanta
// baru tanpa memperbarui tabel ini. Group constants by domain (challenges /
// trending / dashboard) lalu tambahkan dengan urutan deklarasi di bawah.

/** Hari sebelum localStorage `recipes:trendingCount` dianggap basi & di-invalidate. */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const TRENDING_TTL_DAYS = 7;

/** Window agregasi toast bonus klaim grup (ms). */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const GROUP_BONUS_AGGREGATE_MS = 5000;

/** Durasi badge "+N klaim baru" sebelum auto-clear (ms). */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const GROUP_BONUS_BADGE_TTL_MS = 30000;

/** Durasi pulse chip counter Trending saat angka bertambah (ms). */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const TRENDING_COUNTER_PULSE_MS = 1500;

/** Durasi flash "+N" pada badge growth resep (ms). */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const TRENDING_GROWTH_FLASH_MS = 2500;

/** Durasi ring highlight kartu challenge setelah scroll otomatis (ms). */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const CHALLENGE_HIGHLIGHT_MS = 2000;

/** Lama fade-out ring di akhir CHALLENGE_HIGHLIGHT_MS (ms). */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const CHALLENGE_HIGHLIGHT_FADE_MS = 500;

/** Opacity kartu challenge di akhir fade ring (0..1). */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const CHALLENGE_HIGHLIGHT_FADE_OPACITY = 0.9;

/** Durasi transisi spring (opacity & box-shadow) untuk ring highlight (ms). */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const CHALLENGE_HIGHLIGHT_TRANSITION_MS = 700;

/** Interval tick re-render countdown badge bonus klaim (ms). */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const GROUP_BONUS_BADGE_TICK_MS = 1000;

/** Y koordinat baris footer ("hal X / N", brand) pada halaman A4 (pt, jsPDF). */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const PDF_PAGE_FOOTER_Y = 820;

/** Margin horizontal kiri PDF (pt). Kanan dihitung 595 - PDF_MARGIN_X. */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const PDF_MARGIN_X = 40;

/** Lebar halaman A4 PDF (pt, jsPDF). */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const PDF_PAGE_W = 595;

/** Tinggi halaman A4 PDF (pt, jsPDF). */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const PDF_PAGE_H = 842;
