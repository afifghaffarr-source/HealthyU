import { createFileRoute } from "@tanstack/react-router";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { exportMyData } from "@/features/privacy/lib/pdpRights.functions";
import {
  recordExportStart,
  recordExportComplete,
  getExportHistory,
} from "@/features/privacy/lib/preferences.functions";
import { BottomNav } from "@/components/bottom-nav";
import {
  Download,
  FileJson,
  FileSpreadsheet,
  Loader2,
  Check,
  X,
  Database,
  Shield,
  Clock,
} from "lucide-react";
import { toast } from "@/lib/toast-config";
import { toastError } from "@/lib/toast-config";

export const Route = createFileRoute("/_authenticated/backup")({
  component: BackupPage,
});

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const keys = Array.from(
    rows.reduce((s, r) => {
      Object.keys(r).forEach((k) => s.add(k));
      return s;
    }, new Set<string>()),
  );
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n");
}

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "baru saja";
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} jam lalu`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD} hari lalu`;
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

function BackupPage() {
  const qc = useQueryClient();
  const exportFn = useServerFn(exportMyData);
  const startFn = useServerFn(recordExportStart);
  const completeFn = useServerFn(recordExportComplete);
  const historyFn = useServerFn(getExportHistory);
  const [busy, setBusy] = useState<"json" | "csv" | null>(null);

  const { data: history = [] } = useQuery({
    queryKey: ["export-history"],
    queryFn: () => historyFn(),
  });

  // Refresh history on mount + when export completes
  useEffect(() => {
    if (!busy) qc.invalidateQueries({ queryKey: ["export-history"] });
  }, [busy, qc]);

  const handle = async (format: "json" | "csv") => {
    setBusy(format);
    let exportId: string | null = null;
    try {
      // 1. Record start
      const startRes = await startFn({ data: { format } });
      exportId = startRes.export_id;

      // 2. Export data
      const dump = (await exportFn()) as Record<string, unknown>;
      const exported_at = dump.exported_at as string;
      const user_id = dump.user_id as string;
      const tables: Record<string, unknown> = {};
      let totalRows = 0;
      let tableCount = 0;
      for (const [k, v] of Object.entries(dump)) {
        if (k === "exported_at" || k === "user_id") continue;
        tables[k] = v;
        if (Array.isArray(v)) {
          totalRows += v.length;
          tableCount += 1;
        }
      }
      const stamp = new Date().toISOString().slice(0, 10);
      let content: string;
      let filename: string;
      let mime: string;

      if (format === "json") {
        content = JSON.stringify({ exported_at, user_id, tables }, null, 2);
        filename = `healthyu-backup-${stamp}.json`;
        mime = "application/json";
      } else {
        const parts: string[] = [];
        for (const [name, value] of Object.entries(tables)) {
          if (!Array.isArray(value) || value.length === 0) continue;
          parts.push(`# ${name}`);
          parts.push(toCSV(value as Record<string, unknown>[]));
          parts.push("");
        }
        content = parts.join("\n");
        filename = `healthyu-backup-${stamp}.csv`;
        mime = "text/csv";
      }

      // 3. Trigger download
      download(filename, content, mime);
      const sizeBytes = new Blob([content]).size;

      // 4. Record completion
      if (exportId) {
        await completeFn({
          data: {
            export_id: exportId,
            status: "completed",
            size_bytes: sizeBytes,
            table_count: tableCount,
            row_count: totalRows,
          },
        });
      }

      toast.success(
        `Backup ${format.toUpperCase()} berhasil · ${tableCount} tabel, ${totalRows} baris`,
      );
    } catch (e) {
      if (exportId) {
        await completeFn({
          data: {
            export_id: exportId,
            status: "failed",
            error_message: e instanceof Error ? e.message : "Unknown error",
          },
        });
      }
      toastError(e, "Gagal membuat backup");
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="min-h-dvh bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-2 space-y-5">
        <TopAppBar title="Backup & Ekspor" showBack />

        {/* Hero */}
        <section className="bg-gradient-to-br from-primary/10 to-primary/5 p-5 rounded-3xl outline-1 outline-primary/20 space-y-3">
          <div className="size-12 rounded-2xl bg-primary/10 grid place-items-center text-primary">
            <Download className="size-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Unduh semua data Anda</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Termasuk profil, makanan, latihan, tidur, vital signs, obat, mood, komunitas, dan
              pencapaian. Data Anda milik Anda — bawa kapan saja.
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1">
            <div className="inline-flex items-center gap-1">
              <Shield className="size-3 text-emerald-600" />
              <span>Audit logged</span>
            </div>
            <div className="inline-flex items-center gap-1">
              <Database className="size-3 text-blue-600" />
              <span>Semua tabel</span>
            </div>
          </div>
        </section>

        {/* Format buttons */}
        <section className="space-y-2">
          <button
            onClick={() => handle("json")}
            disabled={busy !== null}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-4 rounded-2xl disabled:opacity-60 active:scale-[0.99] transition"
          >
            {busy === "json" ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Generating JSON...</span>
              </>
            ) : (
              <>
                <FileJson className="size-4" />
                <span>Unduh JSON (lengkap)</span>
              </>
            )}
          </button>

          <button
            onClick={() => handle("csv")}
            disabled={busy !== null}
            className="w-full flex items-center justify-center gap-2 bg-card outline-1 outline-black/10 font-semibold py-4 rounded-2xl disabled:opacity-60 active:scale-[0.99] transition"
          >
            {busy === "csv" ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Generating CSV...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="size-4" />
                <span>Unduh CSV (per tabel)</span>
              </>
            )}
          </button>
        </section>

        <p className="text-xs text-muted-foreground text-center">
          File berisi semua data pribadi Anda. Simpan di tempat aman.
        </p>

        {/* History */}
        <section className="space-y-2 pt-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Riwayat Ekspor
            </h3>
            {history.length > 0 && (
              <span className="text-[10px] text-muted-foreground">{history.length} entri</span>
            )}
          </div>

          {history.length === 0 ? (
            <div className="bg-card p-5 rounded-2xl outline-1 outline-black/5 text-center text-xs text-muted-foreground">
              Belum ada riwayat export.
            </div>
          ) : (
            <div className="bg-card rounded-2xl outline-1 outline-black/5 overflow-hidden">
              {history.slice(0, 10).map(
                (
                  h: {
                    id: string;
                    status: string;
                    format: string;
                    table_count: number | null;
                    row_count: number | null;
                    size_bytes: number | null;
                    started_at: string;
                    completed_at: string | null;
                  },
                  i: number,
                ) => {
                  const status = h.status;
                  const isLast = i === Math.min(history.length - 1, 9);
                  return (
                    <div
                      key={h.id}
                      className={`p-3 flex items-center gap-3 ${
                        !isLast ? "border-b border-border/30" : ""
                      }`}
                    >
                      <div
                        className={`size-7 rounded-lg grid place-items-center shrink-0 ${
                          status === "completed"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : status === "failed"
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                        }`}
                      >
                        {status === "completed" ? (
                          <Check className="size-3.5" />
                        ) : status === "failed" ? (
                          <X className="size-3.5" />
                        ) : (
                          <Loader2 className="size-3.5 animate-spin" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold uppercase">{h.format}</p>
                          <span className="text-[10px] text-muted-foreground">
                            {h.table_count ?? 0} tabel · {h.row_count ?? 0} baris
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                          <Clock className="size-2.5" />
                          <span>{formatRelativeTime(h.completed_at || h.started_at)}</span>
                          {h.size_bytes && <span>· {formatBytes(h.size_bytes)}</span>}
                        </div>
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          )}
        </section>

        {/* UU PDP disclaimer */}
        <section className="bg-secondary/30 p-3.5 rounded-2xl text-[11px] text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground">Hak Anda (UU PDP No. 27/2022):</strong> Anda berhak
            mengakses, mengoreksi, menghapus, dan membatasi pemrosesan data pribadi Anda. Semua
            ekspor dicatat untuk transparansi dan kepatuhan.
          </p>
        </section>
      </div>
      <BottomNav />
    </main>
  );
}
