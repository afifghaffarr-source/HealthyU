/**
 * Client-side Tesseract.js OCR wrapper for nutrition label scanning.
 *
 * Why client-side?
 *   - Offline-capable (PWA): works on 3G / rural Indonesia tanpa server round-trip
 *   - Private: gambar gak ke-upload ke VexoAPI/OpenAI/Google
 *   - Free: gak hit API multimodal (cost saving — VexoAPI charges per image)
 *   - Fast: 1-3s untuk label sederhana (vs round-trip server)
 *
 * Architecture:
 *   - Lazy import: dynamic import() — chunked, only loaded when user opens scan
 *   - Single worker pool: reused across scans (init cost ~2-3s amortized)
 *   - Bilingual: eng + ind tessdata loaded together
 *   - Confidence scoring: returned for caller to decide fallback strategy
 *   - Cleanup: terminate() called explicitly on unmount (frees ~13MB wasm)
 *
 * Use cases:
 *   - Primary OCR for nutrition labels (Sprint 1d)
 *   - Fallback when AI multimodal fails or user is offline
 *
 * NOT for:
 *   - High-volume batch OCR (use server-side)
 *   - Low-quality photos (server AI multimodal still better for those)
 */

import type { Worker } from "tesseract.js";

export interface OcrProgress {
  status: "loading" | "initializing" | "recognizing" | "done";
  progress: number; // 0..1
}

export interface OcrResult {
  text: string;
  confidence: number; // 0..100 from Tesseract
  language: "eng+ind";
  durationMs: number;
}

let workerPromise: Promise<Worker> | null = null;

/**
 * Lazy-load Tesseract worker. Reuses existing instance across calls.
 * Caller should await this before .recognize() to ensure init finished.
 */
async function getWorker(onProgress?: (p: OcrProgress) => void): Promise<Worker> {
  if (workerPromise) return workerPromise;

  workerPromise = (async () => {
    // Dynamic import — keeps tesseract.js (~13MB) out of main bundle.
    const { createWorker } = await import("tesseract.js");

    const w = await createWorker(["eng", "ind"], 1, {
      logger: (m: { status: string; progress: number }) => {
        onProgress?.({
          status: mapStatus(m.status),
          progress: m.progress,
        });
      },
    });
    return w;
  })();

  return workerPromise;
}

function mapStatus(s: string): OcrProgress["status"] {
  if (s.includes("recognizing")) return "recognizing";
  if (s.includes("initializing")) return "initializing";
  if (s.includes("loading")) return "loading";
  return "done";
}

/**
 * Recognize text from an image (Blob, File, or data URL).
 *
 * @param image - image source
 * @param onProgress - optional progress callback (UI loading bar)
 * @returns OCR result with text + confidence + duration
 *
 * @example
 *   const result = await recognizeImage(file, (p) => setProgress(p.progress));
 *   if (result.confidence < 60) showFallbackHint();
 */
export async function recognizeImage(
  image: Blob | File | string,
  onProgress?: (p: OcrProgress) => void,
): Promise<OcrResult> {
  const start = performance.now();
  const worker = await getWorker(onProgress);
  const { data } = await worker.recognize(image);
  return {
    text: data.text,
    confidence: data.confidence,
    language: "eng+ind",
    durationMs: Math.round(performance.now() - start),
  };
}

/**
 * Terminate worker. Frees ~13MB wasm memory. Call on unmount or after
 * scan flow completes if you want to free memory aggressively.
 *
 * Safe to call multiple times — re-creates worker on next recognizeImage().
 */
export async function terminateOcr(): Promise<void> {
  if (!workerPromise) return;
  try {
    const w = await workerPromise;
    await w.terminate();
  } catch {
    // Ignore termination errors — worker may already be dead
  } finally {
    workerPromise = null;
  }
}

/**
 * Helper: is browser environment? Server-side imports should no-op.
 */
export const isClientOcrSupported = (): boolean =>
  typeof window !== "undefined" && typeof document !== "undefined" && "Worker" in window;
