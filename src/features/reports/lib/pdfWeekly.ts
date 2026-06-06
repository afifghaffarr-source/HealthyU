import {
  PDF_MARGIN_X,
  PDF_HEADER_BASELINE_Y,
  PDF_HEADER_SUBTITLE_Y,
  PDF_TITLE_FONT_SIZE,
  PDF_SUBTITLE_FONT_SIZE,
  PDF_BODY_FONT_SIZE,
  PDF_PAGE_CONTENT_W,
  PDF_LINE_HEIGHT,
  PDF_SECTION_GAP,
  PDF_HEADER_FILL_RGB,
  PDF_MUTED_GRAY,
  PDF_AUTOTABLE_START_Y,
  PDF_TABLE_FONT_SIZE,
  PDF_TABLE_FONT_SIZE_SM,
  PDF_TABLE_CELL_PADDING,
} from "@/lib/constants";
import type { Translator, WeeklySummary } from "./pdfShared";

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
