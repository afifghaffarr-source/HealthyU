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
// | PDF_LINK_BOUND_OFFSET          | Padding kiri+kanan bounding box klik link PDF (pt).      |
// | PDF_LINK_BOUND_HEIGHT          | Tinggi bounding box klik link PDF (pt).                  |
// | PDF_LINK_FONT_SIZE             | Font size back-link "Daftar Isi" di TOC (pt).            |
// | PDF_DIVIDER_LINE_WIDTH         | Ketebalan garis divider PDF (pt, setLineWidth).          |
// | PDF_SECTION_DIVIDER_OFFSET     | Offset Y divider section header dari baseline (pt).      |
// | PDF_LINK_BOUND_Y_OFFSET        | Offset Y atas bounding box klik link dari baseline (pt). |
// | PDF_TOC_INDENT_X               | X indent kiri baris TOC PDF (pt).                        |
// | PDF_TOC_PAGE_LABEL_X           | X kanan kolom "hal. N" baris TOC (pt).                   |
// | PDF_TOC_ROW_BOUND_W            | Lebar bounding box klik baris TOC (pt).                  |
// | PDF_TOC_ROW_BOUND_H            | Tinggi bounding box klik baris TOC (pt).                 |
// | PDF_AUTOTABLE_START_Y          | Y mulai autoTable utama PDF mingguan (pt).               |
// | PDF_BODY_TEXT_OFFSET_Y         | Y baseline body text di bawah section header (pt).       |
// | PDF_TABLE_FONT_SIZE            | Font size body cell autoTable PDF (pt).                  |
// | PDF_TABLE_FONT_SIZE_SM         | Font size cell autoTable PDF varian kompak (pt).         |
// | PDF_TABLE_CELL_PADDING         | Cell padding autoTable PDF (pt).                         |
// | PDF_SECTION_TITLE_GAP          | Jarak vertikal judul section ke divider (pt).            |
//
// CONVENTION: setiap konstanta tunable WAJIB ditambahkan ke tabel di atas
// (nama + 1 baris efek). Reviewer boleh menolak PR yang menambah konstanta
// baru tanpa memperbarui tabel ini. Group constants by domain (challenges /
// trending / dashboard) lalu tambahkan dengan urutan deklarasi di bawah.

export * from "./uiConstants";
export * from "./pdfConstants";
