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
// | PDF_DIVIDER_GRAY               | Nilai abu-abu (0-255) untuk garis divider PDF.           |
// | PDF_HEADER_BASELINE_Y          | Y baseline judul halaman PDF (pt).                       |
// | PDF_HEADER_SUBTITLE_Y          | Y baseline subjudul halaman PDF (pt).                    |
// | PDF_BODY_TOP_Y                 | Y start section header body PDF (pt).                    |
// | PDF_DIVIDER_GRAY_STRONG        | Grayscale 0-255 untuk divider gelap (section header).    |
// | PDF_LINE_HEIGHT                | Tinggi baris standar body PDF (pt).                      |
// | PDF_SECTION_GAP                | Jarak vertikal antar section header dalam body PDF (pt). |
// | PDF_TITLE_FONT_SIZE            | Font size judul utama halaman PDF (pt).                  |
// | PDF_SUBTITLE_FONT_SIZE         | Font size subjudul/section header PDF (pt).              |
// | PDF_BODY_FONT_SIZE             | Font size body teks PDF (pt).                            |
// | PDF_FOOTER_FONT_SIZE           | Font size baris footer PDF (pt).                         |
// | PDF_FOOTER_PAGE_LABEL          | Label kata halaman footer ("hal"), siap i18n.            |
// | PDF_PAGE_CONTENT_W             | Lebar konten PDF (PDF_PAGE_W - 2*PDF_MARGIN_X, pt).      |
// | PDF_HEADER_FILL_RGB            | Warna fill brand untuk header autoTable PDF ([r,g,b]).   |
// | PDF_LINK_RGB                   | Warna teks+garis hyperlink di PDF ([r,g,b]).             |
// | PDF_MUTED_GRAY                 | Grayscale 0-255 untuk teks muted (subjudul) PDF.         |
// | PDF_TOC_ROWS_PER_PAGE          | Jumlah baris TOC per halaman sebelum addPage().          |
// | PDF_TOC_ROW_HEIGHT             | Tinggi baris TOC (pt) — tocY increment.                  |
// | PDF_FOOTER_BRAND_LABEL         | Label brand kiri footer PDF (siap i18n).                 |
// | PDF_LINK_BASELINE_Y            | Y baseline back-link "Daftar Isi" di TOC (pt).           |
// | PDF_LINK_UNDERLINE_OFFSET      | Offset Y underline back-link (pt, relatif ke baseline).  |
// | PDF_LINK_RIGHT_X               | X kanan back-link TOC (pt).                              |
// | PDF_TOC_PAGE_BREAK_Y           | Y treshold tocY sebelum addPage() di TOC (pt).           |
// | PDF_TOC_CONTINUED_TOP_Y        | Y start tocY di halaman TOC lanjutan (pt).               |
// | PDF_FOOTER_DIVIDER_OFFSET      | Offset Y divider tipis di atas footer (pt).              |
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

/** Nilai grayscale 0-255 untuk garis divider PDF (setDrawColor). */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const PDF_DIVIDER_GRAY = 220;

/** Y baseline judul utama halaman PDF (pt). */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const PDF_HEADER_BASELINE_Y = 50;

/** Y baseline subjudul halaman PDF (pt). */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const PDF_HEADER_SUBTITLE_Y = 68;

/** Y start section header pertama dalam body PDF (pt). */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const PDF_BODY_TOP_Y = 100;

/** Grayscale 0-255 untuk divider gelap (section header) — lebih tegas dari PDF_DIVIDER_GRAY. */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const PDF_DIVIDER_GRAY_STRONG = 160;

/** Tinggi baris standar body PDF (pt). */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const PDF_LINE_HEIGHT = 18;

/** Jarak vertikal antar section header dalam body PDF (pt). */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const PDF_SECTION_GAP = 30;

/** Font size judul utama halaman PDF (pt). */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const PDF_TITLE_FONT_SIZE = 18;

/** Font size subjudul / section header PDF (pt). */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const PDF_SUBTITLE_FONT_SIZE = 12;

/** Font size body teks PDF (pt). */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const PDF_BODY_FONT_SIZE = 10;

/** Font size baris footer PDF (pt). */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const PDF_FOOTER_FONT_SIZE = 8;

/** Label kata halaman footer ("hal"), siap diganti saat i18n. */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const PDF_FOOTER_PAGE_LABEL = "hal";

/** Lebar konten PDF (PDF_PAGE_W - 2*PDF_MARGIN_X) untuk splitTextToSize dkk. */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const PDF_PAGE_CONTENT_W = PDF_PAGE_W - 2 * PDF_MARGIN_X;

/** Warna fill brand untuk header autoTable PDF. */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const PDF_HEADER_FILL_RGB: [number, number, number] = [107, 142, 90];

/** Warna teks & garis hyperlink di PDF (back-link TOC). */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const PDF_LINK_RGB: [number, number, number] = [80, 80, 200];

/** Grayscale 0-255 untuk teks muted (subjudul/footer) PDF. */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const PDF_MUTED_GRAY = 120;

/** Jumlah baris TOC per halaman sebelum addPage(). */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const PDF_TOC_ROWS_PER_PAGE = 40;

/** Tinggi baris TOC (pt) — increment tocY tiap row. */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const PDF_TOC_ROW_HEIGHT = 16;

/** Label brand kiri footer PDF (siap i18n). */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const PDF_FOOTER_BRAND_LABEL = "HealthyU \u00B7 diekspor";

/** Y baseline back-link "← Daftar Isi" di TOC (pt). */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const PDF_LINK_BASELINE_Y = 40;

/** Offset Y underline back-link relatif ke baseline (pt). */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const PDF_LINK_UNDERLINE_OFFSET = 2;

/** X kanan back-link TOC (pt). */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const PDF_LINK_RIGHT_X = 555;

/** Y treshold tocY sebelum addPage() di TOC (pt). */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const PDF_TOC_PAGE_BREAK_Y = 780;

/** Y start tocY di halaman TOC lanjutan (pt). */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const PDF_TOC_CONTINUED_TOP_Y = 80;

/** Offset Y divider tipis di atas footer (pt). */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const PDF_FOOTER_DIVIDER_OFFSET = 8;
