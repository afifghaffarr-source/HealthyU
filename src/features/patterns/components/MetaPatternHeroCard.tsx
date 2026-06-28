/**
 * Meta-Pattern Hero Card (Sprint 13 Dashboard)
 * Shows top meta-pattern alert on dashboard
 *
 * Sprint 22 — Pola Gagal Diet urgency escalation:
 *   When urgency_score >= HIGH_URGENCY_THRESHOLD, escalate visual treatment
 *   to red/warning style + add a "Aksi sekarang" CTA linking to the
 *   detailed insights page. Below threshold: amber informational style
 *   (unchanged from Sprint 13).
 */

import { Link } from "@tanstack/react-router";
import { AlertTriangle, TrendingUp, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PatternInsight, PatternType } from "../types/pattern";
import { PATTERN_METADATA } from "../types/pattern";
import { handleQuickAction } from "../lib/quickActions";

/**
 * Single source of truth for the urgency escalation threshold.
 * Exported so tests + other UI can import the same value (no drift).
 *
 * Why 0.7 (not 0.5 or 0.8):
 *   - Below 0.5 ▸ informational (most patterns)
 *   - 0.5–0.69    ▸ amber alert (default for active meta-patterns)
 *   - 0.7+        ▸ red escalation — pattern requires active user action
 *                  (driven by empirical observation that urgency scores
 *                  cluster in the 0.3–0.6 range for healthy patterns
 *                  and jump to 0.7+ only when 3+ concurrent sub-patterns
 *                  fire with recent overlap)
 */
export const HIGH_URGENCY_THRESHOLD = 0.7;

// eslint-disable-next-line react-refresh/only-export-components -- feature barrel intentionally mixes components + constants (AUDIT-006 acknowledged baseline)
export function isHighUrgency(score: number | undefined | null): boolean {
  // Guard: `Infinity >= 0.7` is `true` in JS, which would silently escalate
  // the dashboard hero on garbage scores from broken upstream callers.
  // Number.isFinite filters Infinity/NaN; the threshold comparison filters
  // the rest.
  return typeof score === "number" && Number.isFinite(score) && score >= HIGH_URGENCY_THRESHOLD;
}

interface MetaPatternHeroCardProps {
  pattern: PatternInsight;
}

export function MetaPatternHeroCard({ pattern }: MetaPatternHeroCardProps) {
  // Extract meta info from analysis_metadata
  const metadata = (pattern.analysis_metadata || {}) as Record<string, unknown>;
  const metaTitle = (metadata.metapattern_title as string) || "Pola Gabungan Terdeteksi";
  const metaDescription = (metadata.metapattern_description as string) || pattern.ai_explanation;
  const components = pattern.metapattern_components || [];

  // Map pattern_type to readable titles
  const componentLabels = components
    .map((pt) => PATTERN_METADATA[pt as PatternType]?.title || pt)
    .join(" + ");

  const high = isHighUrgency(pattern.urgency_score);

  // Two visual treatments — keep all classNames explicit so tests can
  // assert presence of the high-urgency data attribute as a stable hook.
  const containerClass = high
    ? "rounded-xl border-2 border-red-500 bg-gradient-to-br from-red-50 to-rose-50 p-4 dark:from-red-950/30 dark:to-rose-950/30 dark:border-red-600"
    : "rounded-xl border-2 border-amber-500 bg-gradient-to-br from-amber-50 to-orange-50 p-4 dark:from-amber-950/30 dark:to-orange-950/30 dark:border-amber-600";

  const iconBg = high ? "bg-red-500" : "bg-amber-500";
  const icon = high ? <ShieldAlert size={20} /> : <AlertTriangle size={20} />;
  const titleClass = high
    ? "font-semibold text-red-900 dark:text-red-100"
    : "font-semibold text-amber-900 dark:text-amber-100";
  const descClass = high
    ? "text-sm text-red-800 dark:text-red-200 mb-2 line-clamp-2"
    : "text-sm text-amber-800 dark:text-amber-200 mb-2 line-clamp-2";
  const badgeClass = high
    ? "inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-xs font-medium text-white"
    : "inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-medium text-white";
  const linkClass = high
    ? "block text-xs font-medium text-red-600 dark:text-red-400 hover:underline"
    : "block text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline";

  return (
    <div className={containerClass} data-urgency-level={high ? "high" : "normal"}>
      <div className="flex items-start gap-3 mb-3">
        <div className={`rounded-lg p-2 text-white ${iconBg}`}>{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={titleClass}>{metaTitle}</h3>
            <span className={badgeClass}>
              <TrendingUp size={12} />
              {pattern.urgency_score}
            </span>
          </div>
          <p className={descClass}>{metaDescription}</p>
          {components.length > 0 && (
            <div
              className={`flex items-center gap-2 text-xs ${high ? "text-red-700 dark:text-red-300" : "text-amber-700 dark:text-amber-300"}`}
            >
              <span className="font-medium">Gabungan:</span>
              <span className="truncate">{componentLabels}</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      {pattern.quick_actions && pattern.quick_actions.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {pattern.quick_actions.slice(0, 3).map((action, idx) => (
            <Button
              key={idx}
              variant="outline"
              size="sm"
              className={`text-xs ${high ? "border-red-600 text-red-900 hover:bg-red-100 dark:border-red-500 dark:text-red-100 dark:hover:bg-red-950/50" : "border-amber-600 text-amber-900 hover:bg-amber-100 dark:border-amber-500 dark:text-amber-100 dark:hover:bg-amber-950/50"}`}
              onClick={() => handleQuickAction(action)}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}

      {/* Sprint 22 — high-urgency CTA. Only renders when score >= threshold.
          NOT a generic "Lihat detail" — it's an "Aksi sekarang" active verb
          because the situation requires user intervention, not just curiosity. */}
      {high && (
        <Link to="/profile/insights">
          <Button
            variant="default"
            size="sm"
            className="w-full bg-red-600 hover:bg-red-700 text-white mb-2"
          >
            Aksi sekarang →
          </Button>
        </Link>
      )}

      {/* Link to full insights */}
      <Link to="/profile/insights" className={linkClass}>
        Lihat detail lengkap & rekomendasi →
      </Link>
    </div>
  );
}
