/**
 * /scan/nutrition-label — Client-side Tesseract OCR with AI fallback.
 *
 * Flow:
 *   1. User captures/uploads label image
 *   2. Client OCR runs (Tesseract.js, offline-capable, private)
 *   3. Parser extracts nutrition fields from text
 *   4. If confidence >= threshold → show parsed result
 *   5. If confidence < threshold → suggest AI fallback (server multimodal)
 *
 * Why client-first?
 *   - Offline-capable (PWA): works on 3G / rural Indonesia
 *   - Private: image stays on device (no server upload unless user opts in)
 *   - Free: no VexoAPI cost for primary path
 *   - Fast: 1-3s for clear labels
 *
 * AI fallback is opt-in via "Coba AI" button after low confidence.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Camera, ScanLine, Sparkles, RotateCcw, Check, Wifi, WifiOff } from "lucide-react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ocrNutritionLabel } from "@/features/scan/lib/scanBatch12.functions";
import {
  recognizeImage,
  terminateOcr,
  type OcrProgress,
  isClientOcrSupported,
} from "@/features/scan/lib/ocr-client";
import {
  parseNutritionLabel,
  type ParseResult,
  type NutritionLabelData,
} from "@/features/scan/lib/nutrition-parser";
import { validateImageFile, fileToDataUrl, dataUrlToBlob } from "@/lib/image-utils";
import { toast } from "@/lib/toast-config";

export const Route = createFileRoute("/_authenticated/scan/nutrition-label")({
  component: Page,
});

// Confidence threshold for AI fallback suggestion
const CONFIDENCE_THRESHOLD = 50;

type Phase =
  | { kind: "idle" }
  | { kind: "preview"; src: string; base64: string }
  | { kind: "scanning"; src: string; progress: number; status: string }
  | {
      kind: "parsed";
      src: string;
      parsed: ParseResult;
      /** OCR text + confidence — needed for AI fallback (text-only path). */
      ocrText: string;
      ocrConfidence: number;
    }
  | { kind: "ai-scanning"; src: string; ocrText: string; ocrConfidence: number };

function Page() {
  const aiFn = useServerFn(ocrNutritionLabel);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [ocrSupported] = useState(isClientOcrSupported);

  const aiMut = useMutation({
    // Sprint 2b fix: send OCR text (not image) — VexoAPI has no vision models.
    mutationFn: (p: { ocrText: string; ocrConfidence: number }) =>
      aiFn({ data: { ocrText: p.ocrText, ocrConfidence: p.ocrConfidence } }),
    onSuccess: (data) => {
      // Show AI result as parsed-style card
      const nutrition: NutritionLabelData = {
        servingSize: null,
        calories: typeof data.nutrition.calories === "number" ? data.nutrition.calories : null,
        protein_g: typeof data.nutrition.protein_g === "number" ? data.nutrition.protein_g : null,
        carbs_g: typeof data.nutrition.carbs_g === "number" ? data.nutrition.carbs_g : null,
        sugar_g: typeof data.nutrition.sugar_g === "number" ? data.nutrition.sugar_g : null,
        fat_g: typeof data.nutrition.fat_g === "number" ? data.nutrition.fat_g : null,
        sat_fat_g: null,
        trans_fat_g: null,
        fiber_g: null,
        sodium_mg: typeof data.nutrition.sodium_mg === "number" ? data.nutrition.sodium_mg : null,
        salt_g: null,
        cholesterol_mg: null,
      };
      setPhase((prev) =>
        prev.kind === "ai-scanning"
          ? {
              kind: "parsed",
              src: prev.src,
              parsed: { nutrition, confidence: 90, matchedFields: 6, totalFields: 12 },
              ocrText: prev.ocrText,
              ocrConfidence: prev.ocrConfidence,
            }
          : prev,
      );
      toast.success("Selesai dibaca AI");
    },
    onError: (e: Error) => toast.error(e.message || "AI OCR gagal"),
  });

  // Cleanup OCR worker on unmount
  useEffect(() => {
    return () => {
      void terminateOcr();
    };
  }, []);

  async function onFile(f?: File) {
    if (!f) return;
    try {
      validateImageFile(f);
    } catch (err) {
      toast.error((err as Error).message);
      return;
    }
    const dataUrl = await fileToDataUrl(f);
    setPhase({ kind: "preview", src: dataUrl, base64: dataUrl.split(",")[1] ?? "" });
  }

  async function startClientScan() {
    if (phase.kind !== "preview") return;
    if (!ocrSupported) {
      toast.error("Browser tidak mendukung OCR. Gunakan AI fallback.");
      return;
    }
    const blob = await dataUrlToBlob(phase.src);
    setPhase({
      kind: "scanning",
      src: phase.src,
      progress: 0,
      status: "Mempersiapkan engine OCR…",
    });
    try {
      const result = await recognizeImage(blob, (p: OcrProgress) => {
        setPhase((prev) =>
          prev.kind === "scanning"
            ? {
                kind: "scanning",
                src: prev.src,
                progress: p.progress,
                status: progressLabel(p),
              }
            : prev,
        );
      });
      const parsed = parseNutritionLabel(result.text);
      setPhase({
        kind: "parsed",
        src: phase.src,
        parsed,
        ocrText: result.text,
        ocrConfidence: result.confidence,
      });
      if (parsed.confidence < CONFIDENCE_THRESHOLD) {
        toast.success(
          `Teks terbaca (confidence ${result.confidence.toFixed(0)}%). Pertimbangkan AI fallback untuk hasil lebih akurat.`,
        );
      } else {
        toast.success(`Berhasil! ${parsed.matchedFields}/${parsed.totalFields} field terdeteksi.`);
      }
    } catch (err) {
      toast.error(`OCR gagal: ${(err as Error).message}. Coba AI fallback.`);
      setPhase({ kind: "preview", src: phase.src, base64: phase.base64 });
    }
  }

  function startAiScan() {
    if (phase.kind !== "parsed") return;
    const { src, ocrText, ocrConfidence } = phase;
    setPhase({ kind: "ai-scanning", src, ocrText, ocrConfidence });
    aiMut.mutate({ ocrText, ocrConfidence });
  }

  function reset() {
    setPhase({ kind: "idle" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Scan Label Nutrisi" subtitle="Client-side OCR · tanpa upload" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {/* Offline-capable banner */}
        <Card className="p-3 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900">
          <div className="flex items-start gap-2.5">
            {ocrSupported ? (
              <Wifi className="size-4 mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <WifiOff className="size-4 mt-0.5 text-amber-600 shrink-0" />
            )}
            <p className="text-xs leading-relaxed text-emerald-900 dark:text-emerald-100">
              {ocrSupported
                ? "Scan berjalan 100% di perangkat. Gambar label tidak di-upload kecuali Anda pilih AI fallback."
                : "Browser tidak support client OCR. Pakai AI fallback (perlu internet)."}
            </p>
          </div>
        </Card>

        {/* Image preview */}
        {(phase.kind === "preview" ||
          phase.kind === "scanning" ||
          phase.kind === "parsed" ||
          phase.kind === "ai-scanning") && (
          <div className="rounded-2xl overflow-hidden border bg-card">
            <img
              src={phase.src}
              alt="Label nutrisi"
              className="w-full max-h-72 object-contain bg-muted"
            />
          </div>
        )}

        {/* Idle state: capture/upload */}
        {phase.kind === "idle" && (
          <div className="space-y-3">
            <Button size="lg" className="w-full" onClick={() => fileInputRef.current?.click()}>
              <Camera className="size-4 mr-2" />
              Ambil Foto Label
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              <ScanLine className="size-4 mr-2" />
              Pilih dari Galeri
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => onFile(e.target.files?.[0])}
              className="hidden"
            />
          </div>
        )}

        {/* Preview state: confirm or retake */}
        {phase.kind === "preview" && (
          <div className="space-y-3">
            <Button size="lg" className="w-full" onClick={startClientScan} disabled={!ocrSupported}>
              <ScanLine className="size-4 mr-2" />
              Scan Sekarang (Client OCR)
            </Button>
            {!ocrSupported && (
              <Button
                size="lg"
                variant="outline"
                className="w-full"
                disabled
                title="Browser tidak mendukung OCR. Update browser atau pakai device lain untuk scan."
              >
                <Sparkles className="size-4 mr-2" />
                AI perlu OCR (browser tidak support)
              </Button>
            )}
            <Button size="sm" variant="ghost" className="w-full" onClick={reset}>
              <RotateCcw className="size-3.5 mr-1.5" />
              Ganti Foto
            </Button>
          </div>
        )}

        {/* Scanning state: progress */}
        {phase.kind === "scanning" && (
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Memproses…</p>
              <span className="text-xs text-muted-foreground tabular-nums">
                {Math.round(phase.progress * 100)}%
              </span>
            </div>
            <Progress value={phase.progress * 100} className="h-1.5" />
            <p className="text-xs text-muted-foreground">{phase.status}</p>
          </Card>
        )}

        {/* Parsed state: results */}
        {phase.kind === "parsed" && (
          <>
            <NutritionCard parsed={phase.parsed} />
            {phase.parsed.confidence < CONFIDENCE_THRESHOLD && (
              <Button
                size="lg"
                variant="outline"
                className="w-full"
                onClick={startAiScan}
                disabled={aiMut.isPending}
              >
                <Sparkles className="size-4 mr-2" />
                Coba AI (Parser Teks) untuk Akurasi
              </Button>
            )}
            <Button size="sm" variant="ghost" className="w-full" onClick={reset}>
              <RotateCcw className="size-3.5 mr-1.5" />
              Scan Label Lain
            </Button>
          </>
        )}

        {/* AI scanning state */}
        {phase.kind === "ai-scanning" && (
          <Card className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 animate-pulse text-violet-600" />
              <p className="text-sm font-medium">AI sedang parsing teks OCR…</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Mengirim teks hasil OCR (gambar tetap di perangkat). Butuh ~3-5 detik.
            </p>
          </Card>
        )}
      </main>
      <BottomNav />
    </div>
  );
}

function progressLabel(p: OcrProgress): string {
  if (p.status === "loading") return "Memuat model OCR (~13MB)…";
  if (p.status === "initializing") return "Inisialisasi engine…";
  if (p.status === "recognizing") return "Membaca teks dari gambar…";
  return "Selesai";
}

function NutritionCard({ parsed }: { parsed: ParseResult }) {
  const { nutrition, confidence, matchedFields, totalFields } = parsed;
  const rows: { label: string; value: string | null; unit: string }[] = [
    { label: "Energi", value: nutrition.calories?.toString() ?? null, unit: "kkal" },
    { label: "Protein", value: nutrition.protein_g?.toFixed(1) ?? null, unit: "g" },
    { label: "Karbohidrat", value: nutrition.carbs_g?.toFixed(1) ?? null, unit: "g" },
    { label: "Gula", value: nutrition.sugar_g?.toFixed(1) ?? null, unit: "g" },
    { label: "Lemak Total", value: nutrition.fat_g?.toFixed(1) ?? null, unit: "g" },
    { label: "Lemak Jenuh", value: nutrition.sat_fat_g?.toFixed(1) ?? null, unit: "g" },
    { label: "Lemak Trans", value: nutrition.trans_fat_g?.toFixed(1) ?? null, unit: "g" },
    { label: "Serat", value: nutrition.fiber_g?.toFixed(1) ?? null, unit: "g" },
    { label: "Natrium", value: nutrition.sodium_mg?.toString() ?? null, unit: "mg" },
    { label: "Kolesterol", value: nutrition.cholesterol_mg?.toString() ?? null, unit: "mg" },
  ];

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-base">Hasil Scan</h3>
          <p className="text-xs text-muted-foreground">
            {matchedFields}/{totalFields} field terdeteksi ·{" "}
            {nutrition.servingSize ?? "Tanpa takaran saji"}
          </p>
        </div>
        <ConfidenceBadge confidence={confidence} />
      </div>
      <dl className="divide-y divide-border/40 -mx-4">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
            <dt className="text-sm text-muted-foreground">{row.label}</dt>
            <dd className="text-sm font-semibold tabular-nums">
              {row.value ? (
                <>
                  {row.value}{" "}
                  <span className="text-xs text-muted-foreground font-normal">{row.unit}</span>
                </>
              ) : (
                <span className="text-muted-foreground/50 font-normal">—</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  let color = "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
  let label = "Akurat";
  const Icon = Check;
  if (confidence < CONFIDENCE_THRESHOLD) {
    color = "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
    label = "Kurang yakin";
  } else if (confidence < 70) {
    color = "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300";
    label = "Cukup";
  }
  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      <Icon className="size-3" />
      <span>{label}</span>
    </div>
  );
}
