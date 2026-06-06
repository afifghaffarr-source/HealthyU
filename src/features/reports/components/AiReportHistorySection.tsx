import { FileText, Share2 } from "lucide-react";
import {
  exportAllArchivePdf,
  exportArchivePdf,
  type ArchiveReport,
  type Translator,
} from "@/features/reports/lib/reportsPdf";

export function AiReportHistorySection({
  history,
  rangeWeeks,
  setRangeWeeks,
  latestId,
  lastSeenId,
  manualFlashId,
  focusLatest,
  t,
  onShare,
}: {
  history: ArchiveReport[];
  rangeWeeks: number;
  setRangeWeeks: (n: number) => void;
  latestId: string | null;
  lastSeenId: string | null;
  manualFlashId: string | null;
  focusLatest: boolean;
  t: Translator;
  onShare: (args: { text: string; periodStart?: string; periodEnd?: string }) => void;
}) {
  const filtered = history.filter((r) => {
    if (rangeWeeks === 0) return true;
    const cutoff = Date.now() - rangeWeeks * 7 * 86400000;
    return new Date(r.created_at).getTime() >= cutoff;
  });
  return (
    <section className="space-y-2 animate-fade-up">
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Riwayat Laporan AI
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportAllArchivePdf(filtered, t)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold bg-card outline-1 outline-black/10 rounded-lg px-2 py-1"
            title="Export semua laporan ke 1 PDF"
          >
            <FileText className="size-3" /> Export semua
          </button>
          <select
            value={rangeWeeks}
            onChange={(e) => setRangeWeeks(Number(e.target.value))}
            className="text-[11px] bg-card outline-1 outline-black/10 rounded-lg px-2 py-1"
          >
            <option value={0}>Semua</option>
            <option value={4}>4 minggu</option>
            <option value={12}>12 minggu</option>
            <option value={26}>26 minggu</option>
          </select>
        </div>
      </div>
      {filtered.map((r, idx) => {
        const text = Array.isArray(r.recommendations) ? String(r.recommendations[0] ?? "") : "";
        const isNew = idx === 0 && latestId === r.id && lastSeenId !== r.id;
        const isManualFlash = manualFlashId === r.id;
        return (
          <details
            key={r.id}
            open={(focusLatest && idx === 0) || isNew}
            className={
              isManualFlash
                ? "bg-card rounded-2xl outline-2 outline-amber-400 p-4 ring-4 ring-amber-200 shadow-md animate-fade-up"
                : isNew
                  ? "bg-card rounded-2xl outline-2 outline-primary p-4 ring-2 ring-primary/20 shadow-md animate-fade-up"
                  : "bg-card rounded-2xl outline-1 outline-black/5 p-4"
            }
          >
            <summary className="cursor-pointer text-sm font-semibold flex items-center justify-between">
              <span className="inline-flex items-center gap-2">
                {isNew && (
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                    Baru
                  </span>
                )}
                {r.report_period_start} → {r.report_period_end}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(r.created_at).toLocaleDateString("id-ID")}
              </span>
            </summary>
            <p className="mt-3 text-sm whitespace-pre-wrap leading-relaxed">{text}</p>
            {isManualFlash && text && (
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    onShare({
                      text,
                      periodStart: r.report_period_start ?? undefined,
                      periodEnd: r.report_period_end ?? undefined,
                    });
                  }}
                  className="inline-flex items-center gap-1.5 bg-[#25D366] text-white text-xs font-semibold px-3 py-1.5 rounded-full"
                >
                  <Share2 className="size-3" /> Share
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    exportArchivePdf(r);
                  }}
                  className="inline-flex items-center gap-1.5 bg-card outline-1 outline-black/10 text-xs font-semibold px-3 py-1.5 rounded-full"
                >
                  <FileText className="size-3" /> PDF
                </button>
              </div>
            )}
          </details>
        );
      })}
    </section>
  );
}
