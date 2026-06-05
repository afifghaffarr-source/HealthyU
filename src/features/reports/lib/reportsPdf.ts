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
  PDF_LINE_HEIGHT,
  PDF_SECTION_GAP,
  PDF_HEADER_FILL_RGB,
  PDF_LINK_RGB,
  PDF_MUTED_GRAY,
  PDF_TOC_ROWS_PER_PAGE,
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
  PDF_AUTOTABLE_START_Y,
  PDF_BODY_TEXT_OFFSET_Y,
  PDF_TABLE_FONT_SIZE,
  PDF_TABLE_FONT_SIZE_SM,
  PDF_TABLE_CELL_PADDING,
} from "@/lib/constants";

import type { TranslationKey } from "@/lib/i18n";

export type Translator = (
  key: TranslationKey,
  vars?: Record<string, string | number>,
) => string;

export type WeeklyData = {
  meals: Array<{ logged_at: string; calories: number | string; meal_type: string }>;
  water: Array<{ logged_at: string; amount_ml: number }>;
  workouts: Array<{ performed_at: string; name: string; calories_burned: number }>;
  sleep: Array<{ sleep_start: string; sleep_end: string; quality: number | string }>;
  fasting: Array<{ start_time: string; protocol: string; completed: boolean | null }>;
};

export type WeeklySummary = {
  byDay: Array<{ day: string; cals: number; ml: number; burn: number; hours: number }>;
  totals: { cals: number; ml: number; burn: number; hours: number };
  fastingDone: number;
  workoutCount: number;
  sleepCount: number;
};

export type ArchiveReport = {
  id?: string;
  report_period_start?: string | null;
  report_period_end?: string | null;
  created_at: string;
  recommendations: unknown;
};

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportWeeklyCsv(data: WeeklyData) {
  const lines: string[] = ["type,date,detail,value"];
  data.meals.forEach((m) => lines.push(`meal,${m.logged_at},${m.meal_type},${m.calories}`));
  data.water.forEach((w) => lines.push(`water,${w.logged_at},,${w.amount_ml}`));
  data.workouts.forEach((w) =>
    lines.push(`workout,${w.performed_at},"${w.name}",${w.calories_burned}`),
  );
  data.sleep.forEach((s) =>
    lines.push(
      `sleep,${s.sleep_end},quality_${s.quality},${((new Date(s.sleep_end).getTime() - new Date(s.sleep_start).getTime()) / 3600000).toFixed(2)}`,
    ),
  );
  data.fasting.forEach((f) =>
    lines.push(
      `fasting,${f.start_time},${f.protocol},${f.completed ? "completed" : "incomplete"}`,
    ),
  );
  triggerDownload(
    new Blob([lines.join("\n")], { type: "text/csv" }),
    `laporan-${new Date().toISOString().slice(0, 10)}.csv`,
  );
}

export async function exportWeeklyPdf(
  summary: WeeklySummary,
  aiReport: string | undefined,
  t: Translator,
) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const today = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(PDF_TITLE_FONT_SIZE);
  doc.text(t("pdf.title.weekly7"), PDF_MARGIN_X, PDF_HEADER_BASELINE_Y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(PDF_BODY_FONT_SIZE);
  doc.setTextColor(PDF_MUTED_GRAY);
  doc.text(`Dicetak: ${today}`, PDF_MARGIN_X, PDF_HEADER_SUBTITLE_Y);
  doc.setTextColor(0);

  autoTable(doc, {
    startY: PDF_AUTOTABLE_START_Y,
    head: [[t("pdf.headers.metric"), t("pdf.headers.value")]],
    body: [
      ["Total kalori masuk", `${Math.round(summary.totals.cals)} kcal`],
      ["Kalori terbakar", `${summary.totals.burn} kcal`],
      ["Total air", `${(summary.totals.ml / 1000).toFixed(1)} L`],
      ["Total tidur", `${summary.totals.hours.toFixed(1)} jam`],
      ["Latihan", `${summary.workoutCount} sesi`],
      ["Puasa selesai", `${summary.fastingDone} sesi`],
    ],
    styles: {
      font: "helvetica",
      fontSize: PDF_TABLE_FONT_SIZE,
      cellPadding: PDF_TABLE_CELL_PADDING,
    },
    headStyles: { fillColor: PDF_HEADER_FILL_RGB },
  });

  autoTable(doc, {
    head: [
      [
        t("pdf.headers.date"),
        t("pdf.headers.calIn"),
        t("pdf.headers.water"),
        t("pdf.headers.burn"),
        t("pdf.headers.sleep"),
      ],
    ],
    body: summary.byDay.map((d) => [
      new Date(d.day).toLocaleDateString("id-ID", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
      Math.round(d.cals).toString(),
      d.ml.toString(),
      d.burn.toString(),
      d.hours.toFixed(1),
    ]),
    styles: {
      font: "helvetica",
      fontSize: PDF_TABLE_FONT_SIZE_SM,
      cellPadding: PDF_TABLE_CELL_PADDING,
    },
    headStyles: { fillColor: PDF_HEADER_FILL_RGB },
  });

  if (aiReport) {
    const lastY =
      (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 200;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(PDF_SUBTITLE_FONT_SIZE);
    doc.text("Analisis AI", PDF_MARGIN_X, lastY + PDF_SECTION_GAP);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(PDF_BODY_FONT_SIZE);
    const lines = doc.splitTextToSize(aiReport, PDF_PAGE_CONTENT_W);
    doc.text(lines, PDF_MARGIN_X, lastY + PDF_SECTION_GAP + PDF_LINE_HEIGHT);
  }

  doc.save(`laporan-healthyu-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export async function exportArchivePdf(r: ArchiveReport) {
  const text = Array.isArray(r.recommendations) ? String(r.recommendations[0] ?? "") : "";
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(PDF_TITLE_FONT_SIZE);
  doc.text("Laporan HealthyU", PDF_MARGIN_X, PDF_HEADER_BASELINE_Y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(PDF_BODY_FONT_SIZE);
  doc.setTextColor(PDF_MUTED_GRAY);
  const periode =
    r.report_period_start && r.report_period_end
      ? `Periode: ${r.report_period_start} → ${r.report_period_end}`
      : `Dicetak: ${new Date(r.created_at).toLocaleDateString("id-ID")}`;
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
  const ROWS_PER_TOC_PAGE = PDF_TOC_ROWS_PER_PAGE;
  const tocPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_TOC_PAGE));
  let tocY = 120;
  let tocPageIdx = 0;
  filtered.forEach((r, idx) => {
    const periode =
      r.report_period_start && r.report_period_end
        ? `${r.report_period_start} → ${r.report_period_end}`
        : new Date(r.created_at).toLocaleDateString("id-ID");
    const page = tocPages + idx + 1;
    if (tocY > PDF_TOC_PAGE_BREAK_Y) {
      doc.addPage();
      tocPageIdx += 1;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(PDF_SUBTITLE_FONT_SIZE);
      doc.text(
        t("pdf.toc.continued", { n: tocPageIdx + 1, m: tocPages }),
        PDF_MARGIN_X,
        PDF_HEADER_BASELINE_Y,
      );
      doc.setFont("helvetica", "normal");
      doc.setFontSize(PDF_BODY_FONT_SIZE);
      tocY = PDF_TOC_CONTINUED_TOP_Y;
    }
    doc.text(`${idx + 1}. ${periode}`, PDF_TOC_INDENT_X, tocY);
    doc.text(t("pdf.pageShort", { page }), PDF_TOC_PAGE_LABEL_X, tocY, { align: "right" });
    doc.link(
      PDF_TOC_INDENT_X,
      tocY - PDF_LINK_BOUND_Y_OFFSET,
      PDF_TOC_ROW_BOUND_W,
      PDF_TOC_ROW_BOUND_H,
      { pageNumber: page },
    );
    tocY += PDF_TOC_ROW_HEIGHT;
  });
  filtered.forEach((r, bodyIdx) => {
    doc.addPage();
    const currentPage = tocPages + bodyIdx + 1;
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
        : `Dibuat: ${new Date(r.created_at).toLocaleDateString("id-ID")}`;
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
      contents: `Halaman ${currentPage} dari ${tocPages + filtered.length}`,
      open: false,
      name: "NoIcon",
    });
    doc.setDrawColor(0);
    doc.setTextColor(0);
  });
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
  doc.save(`laporan-healthyu-arsip-${new Date().toISOString().slice(0, 10)}.pdf`);
}