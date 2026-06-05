import {
  PDF_MARGIN_X,
  PDF_PAGE_W,
  PDF_HEADER_BASELINE_Y,
  PDF_HEADER_SUBTITLE_Y,
  PDF_BODY_TOP_Y,
  PDF_TITLE_FONT_SIZE,
  PDF_SUBTITLE_FONT_SIZE,
  PDF_BODY_FONT_SIZE,
  PDF_MUTED_GRAY,
  PDF_TOC_ROWS_PER_PAGE,
  PDF_DIVIDER_GRAY_STRONG,
  PDF_DIVIDER_LINE_WIDTH,
  PDF_SECTION_DIVIDER_OFFSET,
} from "@/lib/constants";
import type { ArchiveReport, Translator } from "./pdfShared";
import {
  drawArchiveBodyPage,
  drawBackLinkAndAnnotation,
  drawFooters,
  drawTocRow,
  startTocContinuedPage,
  TOC_PAGE_BREAK_Y,
} from "./pdfArchiveHelpers";

export async function exportArchivePdf(r: ArchiveReport) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  drawArchiveBodyPage(doc, r, "Dicetak");
  doc.save(`laporan-healthyu-${(r.report_period_end ?? r.created_at).slice(0, 10)}.pdf`);
}

export async function exportAllArchivePdf(filtered: ArchiveReport[], t: Translator) {
  if (filtered.length === 0) return;
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(PDF_TITLE_FONT_SIZE);
  doc.text(t("pdf.title.archive"), PDF_MARGIN_X, PDF_HEADER_BASELINE_Y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(PDF_BODY_FONT_SIZE);
  doc.setTextColor(PDF_MUTED_GRAY);
  doc.text(`Total: ${filtered.length} laporan`, PDF_MARGIN_X, PDF_HEADER_SUBTITLE_Y);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(PDF_SUBTITLE_FONT_SIZE);
  doc.text("Daftar Isi", PDF_MARGIN_X, PDF_BODY_TOP_Y);
  doc.setDrawColor(PDF_DIVIDER_GRAY_STRONG);
  doc.setLineWidth(PDF_DIVIDER_LINE_WIDTH);
  doc.line(
    PDF_MARGIN_X,
    PDF_BODY_TOP_Y + PDF_SECTION_DIVIDER_OFFSET,
    PDF_PAGE_W - PDF_MARGIN_X,
    PDF_BODY_TOP_Y + PDF_SECTION_DIVIDER_OFFSET,
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(PDF_BODY_FONT_SIZE);
  const tocPages = Math.max(1, Math.ceil(filtered.length / PDF_TOC_ROWS_PER_PAGE));
  let tocY = 120;
  let tocPageIdx = 0;
  filtered.forEach((r, idx) => {
    const page = tocPages + idx + 1;
    if (tocY > TOC_PAGE_BREAK_Y) {
      tocPageIdx += 1;
      tocY = startTocContinuedPage(doc, t, tocPageIdx + 1, tocPages);
    }
    tocY = drawTocRow(doc, idx, r, tocY, page, t);
  });
  filtered.forEach((r, bodyIdx) => {
    doc.addPage();
    const currentPage = tocPages + bodyIdx + 1;
    drawArchiveBodyPage(doc, r, "Dibuat");
    drawBackLinkAndAnnotation(doc, currentPage, tocPages + filtered.length, t);
  });
  drawFooters(doc, t);
  doc.save(`laporan-healthyu-arsip-${new Date().toISOString().slice(0, 10)}.pdf`);
}
