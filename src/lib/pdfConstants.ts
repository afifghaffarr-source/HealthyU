/** PDF layout / styling constants. See `src/lib/constants.ts` (barrel) for full table. */
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
// HealthyU Green 500 (#4CAF50)
export const PDF_HEADER_FILL_RGB: [number, number, number] = [76, 175, 80];

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

/** Padding kiri+kanan tambahan untuk bounding box klik link PDF (pt). */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const PDF_LINK_BOUND_OFFSET = 4;

/** Tinggi bounding box klik link PDF (pt). */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const PDF_LINK_BOUND_HEIGHT = 16;

/** Font size back-link "← Daftar Isi" di TOC (pt). */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const PDF_LINK_FONT_SIZE = 9;

/** Ketebalan garis divider PDF (pt) — dipakai setLineWidth(). */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const PDF_DIVIDER_LINE_WIDTH = 0.5;

/** Offset Y divider section header dari baseline (pt). */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const PDF_SECTION_DIVIDER_OFFSET = 4;

/** Offset Y atas bounding box klik link relatif ke baseline (pt). */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const PDF_LINK_BOUND_Y_OFFSET = 10;

/** X indent kiri baris TOC PDF (pt). */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const PDF_TOC_INDENT_X = 40;

/** X kanan kolom "hal. N" baris TOC (pt). */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const PDF_TOC_PAGE_LABEL_X = 510;

/** Lebar bounding box klik (doc.link) baris TOC (pt). */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const PDF_TOC_ROW_BOUND_W = 515;

/** Tinggi bounding box klik (doc.link) baris TOC (pt). */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const PDF_TOC_ROW_BOUND_H = 14;

/** Y mulai autoTable utama PDF mingguan (pt). */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const PDF_AUTOTABLE_START_Y = 90;

/** Y baseline body text di bawah section header (PDF_BODY_TOP_Y + PDF_LINE_HEIGHT, pt). */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const PDF_BODY_TEXT_OFFSET_Y = PDF_BODY_TOP_Y + PDF_LINE_HEIGHT;

/** Font size body cell autoTable PDF (pt). */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const PDF_TABLE_FONT_SIZE = 10;

/** Font size cell autoTable PDF varian kompak (pt, tabel harian). */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const PDF_TABLE_FONT_SIZE_SM = 9;

/** Cell padding autoTable PDF (pt). */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const PDF_TABLE_CELL_PADDING = 4;

/** Jarak vertikal judul section ke divider/baseline berikut (pt). */
// eslint-disable-next-line no-restricted-syntax -- listed in header table
export const PDF_SECTION_TITLE_GAP = PDF_SECTION_DIVIDER_OFFSET;
