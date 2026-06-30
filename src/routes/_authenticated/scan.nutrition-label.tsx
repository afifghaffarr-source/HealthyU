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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import {
  Camera,
  ScanLine,
  Sparkles,
  RotateCcw,
  Check,
  Wifi,
  WifiOff,
  Plus,
  Loader2,
} from "lucide-react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { MedicalDisclaimer } from "@/components/healthyu/MedicalDisclaimer";
import { BottomNav } from "@/components/bottom-nav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ocrNutritionLabel } from "@/features/scan/lib/scanBatch12.functions";
import { scanNutritionLabel, addOcrAsMealLog } from "@/features/food/lib/ocrNutrition.functions";
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
import { toast, toastError } from "@/lib/toast-config";
import type { MealType } from "@/features/food/lib/foodHelpers";
import { useTranslation } from "@/lib/i18n";
import { FeatureDisabled } from "@/components/healthyu/FeatureDisabled";

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
  const { t } = useTranslation();
  const qc = useQueryClient();
  const aiFn = useServerFn(ocrNutritionLabel);
  const visionFn = useServerFn(scanNutritionLabel);
  const addMealFn = useServerFn(addOcrAsMealLog);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [ocrSupported] = useState(isClientOcrSupported);
  const [mealType, setMealType] = useState<MealType>("snack");

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
      toast.success(t("scan.label.aiSuccess"));
    },
    onError: (e: Error) => toast.error(e.message || t("scan.label.aiFailed")),
  });

  // AI Vision OCR — direct image → Gemini (bypasses client Tesseract)
  const visionMut = useMutation({
    mutationFn: (p: { image_data_url: string }) => visionFn({ data: p }),
    onSuccess: (data) => {
      if (!data.ok) {
        toast.error(data.message ?? t("scan.label.readFailedFallback"));
        return;
      }
      const label = data.label;
      const nutrition: NutritionLabelData = {
        servingSize: label.serving_size || null,
        calories: label.calories || null,
        protein_g: label.protein_g || null,
        carbs_g: label.total_carbs_g || null,
        sugar_g: label.total_sugars_g || null,
        fat_g: label.total_fat_g || null,
        sat_fat_g: label.saturated_fat_g || null,
        trans_fat_g: label.trans_fat_g || null,
        fiber_g: label.dietary_fiber_g || null,
        sodium_mg: label.sodium_mg || null,
        salt_g: null,
        cholesterol_mg: label.cholesterol_mg || null,
      };
      setPhase({
        kind: "parsed",
        src: phase.kind === "preview" || phase.kind === "scanning" ? phase.src : "",
        parsed: {
          nutrition,
          confidence: Math.round((label.confidence ?? 0) * 100),
          matchedFields: Object.values(nutrition).filter((v) => v !== null).length,
          totalFields: 10,
          brand: label.brand || undefined,
          productName: label.product_name || undefined,
        } as never,
        ocrText: label.raw_text_summary,
        ocrConfidence: label.confidence ?? 0,
      });
      toast.success(
        `AI Vision: ${label.brand ? label.brand + " " : ""}${label.product_name ?? t("scan.label.detectedFallback")}`,
      );
    },
    onError: (e: Error) => toast.error(e.message || t("scan.label.aiFailed")),
  });

  // Add OCR result as meal log
  const addMealMut = useMutation({
    mutationFn: (p: { label_id: string; meal_type: MealType; multiplier?: number }) =>
      addMealFn({
        data: {
          label_id: p.label_id,
          meal_type: p.meal_type as "breakfast" | "lunch" | "dinner" | "snack",
          multiplier: p.multiplier ?? 1,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meals", "today"] });
      toast.success(t("scan.label.saveToMealLogSuccess"));
    },
    onError: (e: Error) => toastError(e, t("scan.label.saveFailed")),
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
      toast.error(t("scan.label.ocrNotSupported"));
      return;
    }
    const blob = await dataUrlToBlob(phase.src);
    setPhase({
      kind: "scanning",
      src: phase.src,
      progress: 0,
      status: t("scan.label.enginePreparing"),
    });
    try {
      const result = await recognizeImage(blob, (p: OcrProgress) => {
        setPhase((prev) =>
          prev.kind === "scanning"
            ? {
                kind: "scanning",
                src: prev.src,
                progress: p.progress,
                status:
                  p.status === "loading"
                    ? t("scan.label.enginePreparing")
                    : p.status === "initializing"
                      ? t("scan.label.engineInitializing")
                      : p.status === "recognizing"
                        ? t("scan.label.engineReading")
                        : t("scan.label.engineDone"),
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
        toast.success(t("scan.label.lowConfidenceHint", { pct: result.confidence.toFixed(0) }));
      } else {
        toast.success(
          t("scan.label.matchedFields", {
            matched: parsed.matchedFields,
            total: parsed.totalFields,
          }),
        );
      }
    } catch (err) {
      toast.error(t("scan.label.ocrFailed", { msg: (err as Error).message }));
      setPhase({ kind: "preview", src: phase.src, base64: phase.base64 });
    }
  }

  function startAiScan() {
    if (phase.kind !== "parsed") return;
    const { src, ocrText, ocrConfidence } = phase;
    setPhase({ kind: "ai-scanning", src, ocrText, ocrConfidence });
    aiMut.mutate({ ocrText, ocrConfidence });
  }

  function startVisionScan() {
    if (phase.kind !== "preview") return;
    setPhase({
      kind: "scanning",
      src: phase.src,
      progress: 0,
      status: t("scan.label.aiVisionPending"),
    });
    visionMut.mutate({ image_data_url: phase.src });
  }

  function handleAddToMeal(labelId: string) {
    addMealMut.mutate({ label_id: labelId, meal_type: mealType });
  }

  function reset() {
    setPhase({ kind: "idle" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <FeatureDisabled
      flag="feature.scan_label"
      titleKey="scanLabel.featDisabled"
      descKey="scanLabel.featDisabledDesc"
    >
      <div className="min-h-dvh pb-24 bg-background">
        <TopAppBar title={t("scan.label.title")} subtitle={t("scan.label.subtitle")} showBack />
        <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
          {/* Medical safety disclaimer — AI parses label text, not medical advice. */}
          <MedicalDisclaimer variant="disclaimer" compact className="w-full justify-center" />

          {/* Offline-capable banner */}
          <Card className="p-3 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900">
            <div className="flex items-start gap-2.5">
              {ocrSupported ? (
                <Wifi className="size-4 mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <WifiOff className="size-4 mt-0.5 text-amber-600 shrink-0" />
              )}
              <p className="text-xs leading-relaxed text-emerald-900 dark:text-emerald-100">
                {ocrSupported ? t("scan.label.offlineSupported") : t("scan.label.offlineNoSupport")}
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
                alt={t("scan.label.altText")}
                className="w-full max-h-72 object-contain bg-muted"
              />
            </div>
          )}

          {/* Idle state: capture/upload */}
          {phase.kind === "idle" && (
            <div className="space-y-3">
              <Button size="lg" className="w-full" onClick={() => fileInputRef.current?.click()}>
                <Camera className="size-4 mr-2" />
                {t("scan.label.takePhoto")}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <ScanLine className="size-4 mr-2" />
                {t("scan.label.gallery")}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => onFile(e.target.files?.[0])}
                className="hidden"
              />
            </div>
          )}

          {/* Preview state: choose OCR mode */}
          {phase.kind === "preview" && (
            <div className="space-y-3">
              <Button
                size="lg"
                className="w-full"
                onClick={startClientScan}
                disabled={!ocrSupported}
              >
                <ScanLine className="size-4 mr-2" />
                {t("scan.label.clientScan")}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full border-violet-300 text-violet-700 dark:border-violet-700 dark:text-violet-300"
                onClick={startVisionScan}
                disabled={visionMut.isPending}
              >
                <Sparkles className="size-4 mr-2" />
                {t("scan.label.aiVision")}
              </Button>
              {!ocrSupported && (
                <p className="text-xs text-amber-600 dark:text-amber-400 text-center px-2">
                  {t("scan.label.noOcrBrowser")}
                </p>
              )}
              <Button size="sm" variant="ghost" className="w-full" onClick={reset}>
                <RotateCcw className="size-3.5 mr-1.5" />
                {t("scan.label.changePhoto")}
              </Button>
            </div>
          )}

          {/* Scanning state: progress */}
          {phase.kind === "scanning" && (
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{t("scan.label.processing")}</p>
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
                  {t("scan.label.tryAi")}
                </Button>
              )}

              {/* Save to meal log */}
              {visionMut.data?.ok && visionMut.data.label_id && (
                <Card className="p-4 space-y-3 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900">
                  <div className="flex items-center gap-2">
                    <Plus className="size-4 text-emerald-600 dark:text-emerald-400" />
                    <p className="text-sm font-semibold">{t("scan.label.mealLogTitle")}</p>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {(["breakfast", "lunch", "dinner", "snack"] as const).map((mt) => (
                      <button
                        key={mt}
                        type="button"
                        onClick={() => setMealType(mt)}
                        className={`text-xs font-semibold py-2 rounded-lg border transition ${
                          mealType === mt
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-foreground border-border/50 hover:bg-secondary/30"
                        }`}
                      >
                        {mt === "breakfast"
                          ? t("scan.label.mealTypes.breakfast")
                          : mt === "lunch"
                            ? t("scan.label.mealTypes.lunch")
                            : mt === "dinner"
                              ? t("scan.label.mealTypes.dinner")
                              : t("scan.label.mealTypes.snack")}
                      </button>
                    ))}
                  </div>
                  <Button
                    size="lg"
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleAddToMeal(visionMut.data!.label_id!)}
                    disabled={addMealMut.isPending}
                  >
                    {addMealMut.isPending ? (
                      <Loader2 className="size-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="size-4 mr-2" />
                    )}
                    {mealType === "breakfast"
                      ? t("scan.label.savedAs.breakfast")
                      : mealType === "lunch"
                        ? t("scan.label.savedAs.lunch")
                        : mealType === "dinner"
                          ? t("scan.label.savedAs.dinner")
                          : t("scan.label.savedAs.snack")}
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center">
                    {phase.parsed.nutrition.servingSize ?? t("scan.label.servingDefault")}
                  </p>
                </Card>
              )}

              <Button size="sm" variant="ghost" className="w-full" onClick={reset}>
                <RotateCcw className="size-3.5 mr-1.5" />
                {t("scan.label.scanAnother")}
              </Button>
            </>
          )}

          {/* AI scanning state */}
          {phase.kind === "ai-scanning" && (
            <Card className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 animate-pulse text-violet-600" />
                <p className="text-sm font-medium">{t("scan.label.aiParsing")}</p>
              </div>
              <p className="text-xs text-muted-foreground">{t("scan.label.aiParsingHint")}</p>
            </Card>
          )}

          {/* AI Vision scanning state */}
          {visionMut.isPending && (
            <Card className="p-4 space-y-2 border-violet-200 dark:border-violet-800">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 animate-pulse text-violet-600" />
                <p className="text-sm font-medium">{t("scan.label.aiVisionReading")}</p>
              </div>
              <p className="text-xs text-muted-foreground">{t("scan.label.aiVisionHint")}</p>
            </Card>
          )}
        </main>
        <BottomNav />
      </div>
    </FeatureDisabled>
  );
}

function progressLabel_unused(p: OcrProgress): string {
  // Kept for back-compat reference; actual logic now inlined inside Page.
  if (p.status === "loading") return "Memuat model OCR (~13MB)…";
  if (p.status === "initializing") return "Inisialisasi engine…";
  if (p.status === "recognizing") return "Membaca teks dari gambar…";
  return "Selesai";
}

function NutritionCard({ parsed }: { parsed: ParseResult }) {
  const { t } = useTranslation();
  const { nutrition, confidence, matchedFields, totalFields } = parsed;
  const rows: { label: string; value: string | null; unit: string }[] = [
    {
      label: t("scan.label.energy"),
      value: nutrition.calories?.toString() ?? null,
      unit: t("scan.label.kcal"),
    },
    { label: t("scan.label.protein"), value: nutrition.protein_g?.toFixed(1) ?? null, unit: "g" },
    { label: t("scan.label.carbs"), value: nutrition.carbs_g?.toFixed(1) ?? null, unit: "g" },
    { label: t("scan.label.sugar"), value: nutrition.sugar_g?.toFixed(1) ?? null, unit: "g" },
    { label: t("scan.label.fatTotal"), value: nutrition.fat_g?.toFixed(1) ?? null, unit: "g" },
    { label: t("scan.label.fatSat"), value: nutrition.sat_fat_g?.toFixed(1) ?? null, unit: "g" },
    {
      label: t("scan.label.fatTrans"),
      value: nutrition.trans_fat_g?.toFixed(1) ?? null,
      unit: "g",
    },
    { label: t("scan.label.fiber"), value: nutrition.fiber_g?.toFixed(1) ?? null, unit: "g" },
    { label: t("scan.label.sodium"), value: nutrition.sodium_mg?.toString() ?? null, unit: "mg" },
    {
      label: t("scan.label.cholesterol"),
      value: nutrition.cholesterol_mg?.toString() ?? null,
      unit: "mg",
    },
  ];

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-base">{t("scan.label.resultsTitle")}</h3>
          <p className="text-xs text-muted-foreground">
            {t("scan.label.fieldsDetected", { matched: matchedFields, total: totalFields })} ·{" "}
            {nutrition.servingSize ?? t("scan.label.noServingSize")}
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
  const { t } = useTranslation();
  let color = "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
  let label = t("scan.label.confidenceAccurate");
  const Icon = Check;
  if (confidence < CONFIDENCE_THRESHOLD) {
    color = "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
    label = t("scan.label.confidenceLow");
  } else if (confidence < 70) {
    color = "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300";
    label = t("scan.label.confidenceMedium");
  }
  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      <Icon className="size-3" />
      <span>{label}</span>
    </div>
  );
}
