/**
 * Meta-Pattern Hero Card (Sprint 13 Dashboard)
 * Shows top meta-pattern alert on dashboard
 */

import { Link } from "@tanstack/react-router";
import { AlertTriangle, TrendingUp } from "lucide-react";
import type { PatternInsight } from "../types/pattern";

interface MetaPatternHeroCardProps {
  pattern: PatternInsight;
}

export function MetaPatternHeroCard({ pattern }: MetaPatternHeroCardProps) {
  // Extract meta info from analysis_metadata
  const metadata = (pattern.analysis_metadata || {}) as Record<string, unknown>;
  const metaTitle = (metadata.metapattern_title as string) || "Pola Gabungan Terdeteksi";
  const metaDescription = (metadata.metapattern_description as string) || pattern.ai_explanation;
  const components = pattern.metapattern_components || [];

  // Simple label join
  const componentLabels = components.join(" + ");

  return (
    <Link
      to="/profile/insights"
      className="block rounded-xl border-2 border-amber-500 bg-gradient-to-br from-amber-50 to-orange-50 p-4 transition-all hover:shadow-lg dark:from-amber-950/30 dark:to-orange-950/30 dark:border-amber-600"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-amber-500 p-2 text-white">
          <AlertTriangle size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-amber-900 dark:text-amber-100">{metaTitle}</h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-medium text-white">
              <TrendingUp size={12} />
              {pattern.urgency_score}
            </span>
          </div>
          <p className="text-sm text-amber-800 dark:text-amber-200 mb-2 line-clamp-2">
            {metaDescription}
          </p>
          {components.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
              <span className="font-medium">Gabungan:</span>
              <span className="truncate">{componentLabels}</span>
            </div>
          )}
          <div className="mt-3 text-xs font-medium text-amber-600 dark:text-amber-400">
            Ketuk untuk lihat detail & rekomendasi →
          </div>
        </div>
      </div>
    </Link>
  );
}
