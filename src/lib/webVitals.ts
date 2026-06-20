import { onCLS, onINP, onLCP, onFCP, onTTFB } from "web-vitals";
import { reportError } from "@/lib/errorReporting";

/**
 * Web Vitals reporting for HealthyU.
 *
 * Tracks Core Web Vitals (CLS, INP, LCP) plus FCP and TTFB, and reports
 * them to /api/log-error via the existing error reporting pipeline. We
 * reuse the existing infrastructure rather than introducing a new
 * analytics endpoint — the `source: "web-vitals"` discriminator lets us
 * filter in the error_reports table.
 *
 * Why use reportError (instead of a dedicated analytics endpoint):
 *   - Zero new infrastructure; reuses auth, RLS, service-role writes
 *   - Same fire-and-forget semantics, no impact on app perf
 *   - Operations team already monitors error_reports for spikes
 *
 * Rating thresholds (Google "good/needs-improvement/poor"):
 *   CLS:  < 0.1 good,  < 0.25 needs-improvement,  ≥ 0.25 poor
 *   INP:  < 200ms good, < 500ms needs-improvement, ≥ 500ms poor
 *   LCP:  < 2.5s good,  < 4.0s needs-improvement,  ≥ 4.0s poor
 *   FCP:  < 1.8s good,  < 3.0s needs-improvement,  ≥ 3.0s poor
 *   TTFB: < 800ms good, < 1.8s needs-improvement,  ≥ 1.8s poor
 */

type MetricName = "CLS" | "INP" | "LCP" | "FCP" | "TTFB";

interface Metric {
  name: MetricName;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  id: string;
  navigationType?: string;
  delta?: number;
}

let initialized = false;

/**
 * Initialize web-vitals tracking. Idempotent — safe to call multiple times.
 * Should be called once on app mount (typically in __root.tsx).
 *
 * The library lazy-loads only when metrics are actually computed, so the
 * import-time cost is minimal (~5KB gzipped).
 */
export function initWebVitals(): void {
  if (initialized) return;
  if (typeof window === "undefined") return; // SSR guard
  initialized = true;

  const handleMetric = (metric: Metric) => {
    // Only report "needs-improvement" and "poor" — good metrics would
    // flood the table with noise. Adjust if you want 100% sampling for
    // a debug window.
    if (metric.rating === "good") return;

    // reportError is fire-and-forget; never throws.
    const severity = metric.rating === "poor" ? "error" : "warning";
    reportError(
      `${metric.name}=${metric.value.toFixed(1)} (${metric.rating})`,
      {
        source: "web-vitals",
        boundary: "performance",
        metric_name: metric.name,
        metric_value: metric.value,
        metric_rating: metric.rating,
        metric_id: metric.id,
        navigation_type: metric.navigationType,
        // Useful context for diagnosing regressions
        url: window.location.pathname,
        referrer: document.referrer || null,
        // Use the actual delta so we can spot cumulative regressions
        delta: metric.delta ?? null,
      },
      {
        mechanism: "manual",
        severity,
        handled: true,
      },
    );
  };

  // Register all five core metrics. The library batches reports per
  // metric, so this is a one-time setup cost.
  onCLS(handleMetric);
  onINP(handleMetric);
  onLCP(handleMetric);
  onFCP(handleMetric);
  onTTFB(handleMetric);
}
