/** PDF page layout, fonts, dividers. See `src/lib/constants.ts` barrel. */
/* eslint-disable no-restricted-syntax -- listed in header table */

export const PDF_PAGE_FOOTER_Y = 820;
export const PDF_MARGIN_X = 40;
export const PDF_PAGE_W = 595;
export const PDF_PAGE_H = 842;
export const PDF_DIVIDER_GRAY = 220;
export const PDF_HEADER_BASELINE_Y = 50;
export const PDF_HEADER_SUBTITLE_Y = 68;
export const PDF_BODY_TOP_Y = 100;
export const PDF_DIVIDER_GRAY_STRONG = 160;
export const PDF_LINE_HEIGHT = 18;
export const PDF_SECTION_GAP = 30;
export const PDF_TITLE_FONT_SIZE = 18;
export const PDF_SUBTITLE_FONT_SIZE = 12;
export const PDF_BODY_FONT_SIZE = 10;
export const PDF_FOOTER_FONT_SIZE = 8;
export const PDF_FOOTER_PAGE_LABEL = "hal";
export const PDF_PAGE_CONTENT_W = PDF_PAGE_W - 2 * PDF_MARGIN_X;
// HealthyU Green 500 (#4CAF50)
export const PDF_HEADER_FILL_RGB: [number, number, number] = [76, 175, 80];
export const PDF_MUTED_GRAY = 120;
export const PDF_FOOTER_BRAND_LABEL = "HealthyU \u00B7 diekspor";
export const PDF_FOOTER_DIVIDER_OFFSET = 8;
export const PDF_DIVIDER_LINE_WIDTH = 0.5;
export const PDF_SECTION_DIVIDER_OFFSET = 4;
export const PDF_BODY_TEXT_OFFSET_Y = PDF_BODY_TOP_Y + PDF_LINE_HEIGHT;
export const PDF_SECTION_TITLE_GAP = PDF_SECTION_DIVIDER_OFFSET;