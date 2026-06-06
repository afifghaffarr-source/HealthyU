import type { jsPDF } from "jspdf";
import {
  PDF_PAGE_FOOTER_Y,
  PDF_MARGIN_X,
  PDF_PAGE_W,
  PDF_DIVIDER_GRAY,
  PDF_HEADER_BASELINE_Y,
  PDF_HEADER_SUBTITLE_Y,
  PDF_BODY_TOP_Y,
  PDF_TITLE_FONT_SIZE,
  PDF_SUBTITLE_FONT_SIZE,
  PDF_BODY_FONT_SIZE,
  PDF_FOOTER_FONT_SIZE,
  PDF_PAGE_CONTENT_W,
  PDF_LINK_RGB,
  PDF_MUTED_GRAY,
  PDF_TOC_ROW_HEIGHT,
  PDF_DIVIDER_GRAY_STRONG,
  PDF_LINK_BASELINE_Y,
  PDF_LINK_UNDERLINE_OFFSET,
  PDF_LINK_RIGHT_X,
  PDF_TOC_PAGE_BREAK_Y,
  PDF_TOC_CONTINUED_TOP_Y,
  PDF_FOOTER_DIVIDER_OFFSET,
  PDF_LINK_BOUND_OFFSET,
  PDF_LINK_BOUND_HEIGHT,
  PDF_LINK_FONT_SIZE,
  PDF_DIVIDER_LINE_WIDTH,
  PDF_SECTION_DIVIDER_OFFSET,
  PDF_LINK_BOUND_Y_OFFSET,
  PDF_TOC_INDENT_X,
  PDF_TOC_PAGE_LABEL_X,
  PDF_TOC_ROW_BOUND_W,
  PDF_TOC_ROW_BOUND_H,
  PDF_BODY_TEXT_OFFSET_Y,
} from "@/lib/constants";
import type { ArchiveReport, Translator } from "./pdfShared";

type Doc = jsPDF;

export function drawArchiveBodyPage(doc: Doc, r: ArchiveReport, headerPeriodPrefix: string) {
  const text = Array.isArray(r.recommendations) ? String(r.recommendations[0] ?? "") : "";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(PDF_TITLE_FONT_SIZE);
  doc.text("Laporan HealthyU", PDF_MARGIN_X, PDF_HEADER_BASELINE_Y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(PDF_BODY_FONT_SIZE);
  doc.setTextColor(PDF_MUTED_GRAY);
  const periode =
    r.report_period_start && r.report_period_end
      ? `Periode: ${r.report_period_start} → ${r.report_period_end}`
      : `${headerPeriodPrefix}: ${new Date(r.created_at).toLocaleDateString("id-ID")}`;
  doc.text(periode, PDF_MARGIN_X, PDF_HEADER_SUBTITLE_Y);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(PDF_SUBTITLE_FONT_SIZE);
  doc.text("Analisis AI", PDF_MARGIN_X, PDF_BODY_TOP_Y);
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
  const lines = doc.splitTextToSize(text || "(kosong)", PDF_PAGE_CONTENT_W);
  doc.text(lines, PDF_MARGIN_X, PDF_BODY_TEXT_OFFSET_Y);
}

export function drawTocRow(
  doc: Doc,
  idx: number,
  r: ArchiveReport,
  tocY: number,
  pageNumber: number,
  t: Translator,
) {
  const periode =
    r.report_period_start && r.report_period_end
      ? `${r.report_period_start} → ${r.report_period_end}`
      : new Date(r.created_at).toLocaleDateString("id-ID");
  doc.text(`${idx + 1}. ${periode}`, PDF_TOC_INDENT_X, tocY);
  doc.text(t("pdf.pageShort", { page: pageNumber }), PDF_TOC_PAGE_LABEL_X, tocY, {
    align: "right",
  });
  doc.link(
    PDF_TOC_INDENT_X,
    tocY - PDF_LINK_BOUND_Y_OFFSET,
    PDF_TOC_ROW_BOUND_W,
    PDF_TOC_ROW_BOUND_H,
    { pageNumber },
  );
  return tocY + PDF_TOC_ROW_HEIGHT;
}

export function startTocContinuedPage(doc: Doc, t: Translator, n: number, m: number) {
  doc.addPage();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(PDF_SUBTITLE_FONT_SIZE);
  doc.text(t("pdf.toc.continued", { n, m }), PDF_MARGIN_X, PDF_HEADER_BASELINE_Y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(PDF_BODY_FONT_SIZE);
  return PDF_TOC_CONTINUED_TOP_Y;
}

export function drawBackLinkAndAnnotation(
  doc: Doc,
  currentPage: number,
  totalCount: number,
  t: Translator,
) {
  doc.setTextColor(PDF_LINK_RGB[0], PDF_LINK_RGB[1], PDF_LINK_RGB[2]);
  doc.setFontSize(PDF_LINK_FONT_SIZE);
  const linkLabel = t("pdf.backLink", { page: currentPage });
  doc.text(linkLabel, PDF_LINK_RIGHT_X, PDF_LINK_BASELINE_Y, { align: "right" });
  const linkW = doc.getTextWidth(linkLabel);
  doc.setDrawColor(PDF_LINK_RGB[0], PDF_LINK_RGB[1], PDF_LINK_RGB[2]);
  doc.setLineWidth(PDF_DIVIDER_LINE_WIDTH);
  doc.line(
    PDF_LINK_RIGHT_X - linkW,
    PDF_LINK_BASELINE_Y + PDF_LINK_UNDERLINE_OFFSET,
    PDF_LINK_RIGHT_X,
    PDF_LINK_BASELINE_Y + PDF_LINK_UNDERLINE_OFFSET,
  );
  doc.link(
    PDF_LINK_RIGHT_X - linkW - PDF_LINK_BOUND_OFFSET,
    PDF_LINK_BASELINE_Y - PDF_LINK_BOUND_Y_OFFSET,
    linkW + PDF_LINK_BOUND_OFFSET * 2,
    PDF_LINK_BOUND_HEIGHT,
    { pageNumber: 1 },
  );
  (
    doc as unknown as {
      createAnnotation: (a: {
        type: string;
        title?: string;
        bounds: { x: number; y: number; w: number; h: number };
        contents: string;
        open?: boolean;
        name?: string;
        flags?: string[];
      }) => void;
    }
  ).createAnnotation({
    type: "text",
    title: t("pdf.tooltip.navigation"),
    bounds: {
      x: PDF_LINK_RIGHT_X - linkW - PDF_LINK_BOUND_OFFSET,
      y: PDF_LINK_BASELINE_Y - PDF_LINK_BOUND_Y_OFFSET,
      w: linkW + PDF_LINK_BOUND_OFFSET * 2,
      h: PDF_LINK_BOUND_HEIGHT,
    },
    contents: `Halaman ${currentPage} dari ${totalCount}`,
    open: false,
    name: "NoIcon",
  });
  doc.setDrawColor(0);
  doc.setTextColor(0);
}

export function drawFooters(doc: Doc, t: Translator) {
  const totalPages = doc.getNumberOfPages();
  const exportedAt = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const pageRightX = PDF_PAGE_W - PDF_MARGIN_X;
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(PDF_FOOTER_FONT_SIZE);
    doc.setTextColor(PDF_MUTED_GRAY);
    doc.setDrawColor(PDF_DIVIDER_GRAY);
    doc.setLineWidth(PDF_DIVIDER_LINE_WIDTH);
    doc.line(
      PDF_MARGIN_X,
      PDF_PAGE_FOOTER_Y - PDF_FOOTER_DIVIDER_OFFSET,
      pageRightX,
      PDF_PAGE_FOOTER_Y - PDF_FOOTER_DIVIDER_OFFSET,
    );
    doc.text(`${t("pdf.footer.brandLabel")} ${exportedAt}`, PDF_MARGIN_X, PDF_PAGE_FOOTER_Y);
    doc.text(`${t("pdf.footer.pageLabel")} ${p} / ${totalPages}`, pageRightX, PDF_PAGE_FOOTER_Y, {
      align: "right",
    });
    doc.setTextColor(0);
  }
}

export const TOC_PAGE_BREAK_Y = PDF_TOC_PAGE_BREAK_Y;
