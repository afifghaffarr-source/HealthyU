import { createFileRoute } from "@tanstack/react-router";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { exportMyData } from "@/features/privacy/lib/pdpRights.functions";
import { BottomNav } from "@/components/bottom-nav";
import { Download, FileJson, FileSpreadsheet, Loader2 } from "lucide-react";
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

function BackupPage() {
  const exportFn = useServerFn(exportMyData);
  const [busy, setBusy] = useState<"json" | "csv" | null>(null);

  const handle = async (format: "json" | "csv") => {
    setBusy(format);
    try {
      // exportMyData is audit-logged server-side (see pdpRights.functions.ts).
      // The dump object has { exported_at, user_id, ...tables } — separate
      // metadata from per-table data so the CSV branch can skip error markers.
      const dump = (await exportFn()) as Record<string, unknown>;
      const exported_at = dump.exported_at as string;
      const user_id = dump.user_id as string;
      const tables: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(dump)) {
        if (k === "exported_at" || k === "user_id") continue;
        tables[k] = v;
      }
      const stamp = new Date().toISOString().slice(0, 10);
      if (format === "json") {
        download(
          `healthyu-backup-${stamp}.json`,
          JSON.stringify({ exported_at, user_id, tables }, null, 2),
          "application/json",
        );
      } else {
        const parts: string[] = [];
        for (const [name, value] of Object.entries(tables)) {
          // CSV branch can only serialize row arrays. Skip { error: "unavailable" }
          // markers (logged server-side) and empty tables.
          if (!Array.isArray(value) || value.length === 0) continue;
          parts.push(`# ${name}`);
          parts.push(toCSV(value as Record<string, unknown>[]));
          parts.push("");
        }
        download(`healthyu-backup-${stamp}.csv`, parts.join("\n"), "text/csv");
      }
      toast.success("Backup berhasil diunduh");
    } catch (e) {
      toastError(e, "Gagal membuat backup");
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="min-h-dvh bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-2 space-y-5">
        <TopAppBar title="Backup & Ekspor" showBack />

        <section className="bg-card p-5 rounded-3xl outline-1 outline-black/5 space-y-2">
          <div className="size-12 rounded-2xl bg-primary/10 grid place-items-center text-primary">
            <Download className="size-6" />
          </div>
          <h2 className="text-lg font-bold">Unduh semua data Anda</h2>
          <p className="text-sm text-muted-foreground">
            Termasuk profil, makanan, latihan, tidur, vital signs, obat, mood, komunitas, dan
            pencapaian. Data Anda milik Anda — bawa kapan saja.
          </p>
        </section>

        <button
          onClick={() => handle("json")}
          disabled={busy !== null}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-4 rounded-2xl disabled:opacity-60"
        >
          {busy === "json" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <FileJson className="size-4" />
          )}
          Unduh JSON (lengkap)
        </button>

        <button
          onClick={() => handle("csv")}
          disabled={busy !== null}
          className="w-full flex items-center justify-center gap-2 bg-card outline-1 outline-black/10 font-semibold py-4 rounded-2xl disabled:opacity-60"
        >
          {busy === "csv" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <FileSpreadsheet className="size-4" />
          )}
          Unduh CSV (per tabel)
        </button>

        <p className="text-xs text-muted-foreground text-center">
          File berisi semua data pribadi Anda. Simpan di tempat aman.
        </p>
      </div>
      <BottomNav />
    </main>
  );
}
