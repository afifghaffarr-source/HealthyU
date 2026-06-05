import { createFileRoute } from "@tanstack/react-router";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Upload, Apple, Smartphone, Loader2, CheckCircle2 } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { importHealthData } from "@/features/health-import/lib/health-import.functions";
import {
  parseAppleHealthXml,
  parseSamsungCsv,
  type ParsedHealth,
} from "@/features/health-import/lib/parsers";
import { SourceCard, MiniStat } from "@/features/health-import/components/SourceCard";
import { toast } from "sonner";
import { toastError } from "@/lib/toast-config";

export const Route = createFileRoute("/_authenticated/health-import")({
  component: HealthImportPage,
});

function HealthImportPage() {
  const importFn = useServerFn(importHealthData);
  const [parsed, setParsed] = useState<ParsedHealth | null>(null);
  const [parsing, setParsing] = useState(false);

  const mutation = useMutation({
    mutationFn: () => importFn({ data: parsed! }),
    onSuccess: (r) => {
      toast.success(
        `Berhasil: ${r.stepsCount} hari langkah, ${r.weightCount} berat, ${r.workoutCount} workout`,
      );
      setParsed(null);
    },
    onError: (e) => toastError(e, "Gagal import"),
  });

  const handleFile = async (file: File, source: ParsedHealth["source"]) => {
    setParsing(true);
    try {
      const text = await file.text();
      const data =
        source === "apple_health" ? parseAppleHealthXml(text) : parseSamsungCsv(text, file.name);
      setParsed({ source, ...data });
      toast.success(
        `Terdeteksi: ${data.steps.length} langkah, ${data.weight.length} berat, ${data.workouts.length} workout`,
      );
    } catch (e) {
      toastError(e, "Gagal parse file");
    } finally {
      setParsing(false);
    }
  };

  return (
    <main className="min-h-dvh bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-2 space-y-5">
        <TopAppBar title="Import Kesehatan" subtitle="Apple Health / Samsung Health" showBack />

        <section className="bg-card rounded-2xl p-4 outline-1 outline-black/10 text-xs text-muted-foreground space-y-2">
          <p className="font-semibold text-foreground">Cara ekspor data:</p>
          <p>
            <b>📱 iPhone (Apple Health):</b> Buka Health app → profile pojok kanan atas → "Export
            All Health Data" → ekstrak ZIP → upload file <code>export.xml</code> di bawah.
          </p>
          <p>
            <b>📱 Samsung Health:</b> Settings → Download personal data → ekstrak ZIP → upload file
            CSV (steps / weight / exercise).
          </p>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <SourceCard
            icon={<Apple className="size-6" />}
            label="Apple Health"
            hint="export.xml"
            accept=".xml"
            onFile={(f) => handleFile(f, "apple_health")}
            disabled={parsing}
          />
          <SourceCard
            icon={<Smartphone className="size-6" />}
            label="Samsung Health"
            hint=".csv"
            accept=".csv"
            onFile={(f) => handleFile(f, "samsung_health")}
            disabled={parsing}
          />
        </div>

        {parsing && (
          <p className="text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="size-4 animate-spin" /> Memproses file...
          </p>
        )}

        {parsed && (
          <section className="bg-card rounded-2xl p-4 outline-1 outline-black/10 space-y-3">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <CheckCircle2 className="size-4 text-primary" /> Siap diimport
            </h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <MiniStat label="Langkah" v={parsed.steps.length} />
              <MiniStat label="Berat" v={parsed.weight.length} />
              <MiniStat label="Workout" v={parsed.workouts.length} />
            </div>
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {mutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              {mutation.isPending ? "Mengimport..." : "Import sekarang"}
            </button>
            <button
              onClick={() => setParsed(null)}
              className="w-full text-xs text-muted-foreground"
            >
              Batal
            </button>
          </section>
        )}
      </div>
      <BottomNav />
    </main>
  );
}