/**
 * Pattern Timeline View
 *
 * Vertical chronological display of all pattern insights (active + resolved).
 * Dot per pattern, urgency-colored ring, line connects them.
 *
 * Sprint 15 - Timeline view for Option B feature.
 *
 * ponytail: pure presentation. Sort done by useAllPatterns query (detected_at DESC).
 * No new state, no new fetch — just layout variant. Add when: data volume >100 patterns.
 */

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Coffee, Moon, Heart, Users, Calendar, MapPin, Apple } from "lucide-react";
import type { PatternInsight, QuickAction } from "../types/pattern.js";

interface PatternTimelineProps {
  patterns: PatternInsight[];
  onQuickAction?: (action: QuickAction) => void;
}

const ICONS: Record<string, typeof AlertCircle> = {
  skip_breakfast: Coffee,
  late_night_eating: Moon,
  stress_eating: Heart,
  gathering_overeat: Users,
  busy_day_skips: Calendar,
  warung_overeat: MapPin,
  eating_not_hungry: Apple,
  // Fallback for patterns not in icon map -> AlertCircle
};

function urgencyRingClass(score: number): string {
  if (score >= 85) return "ring-red-500";
  if (score >= 70) return "ring-orange-500";
  return "ring-yellow-500";
}

function urgencyBadgeClass(score: number): string {
  if (score >= 85) return "bg-red-100 text-red-700";
  if (score >= 70) return "bg-orange-100 text-orange-700";
  return "bg-yellow-100 text-yellow-700";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}

export function PatternTimeline({ patterns, onQuickAction }: PatternTimelineProps) {
  if (patterns.length === 0) {
    return (
      <Card className="p-6 text-center text-gray-500">
        <p className="text-sm">Belum ada pattern untuk ditampilkan di timeline</p>
      </Card>
    );
  }

  // Group by exact date so same-day detections render side-by-side rather than as
  // separate ticking moments — keeps the timeline readable.
  const groupedPatterns = patterns.reduce<Map<string, PatternInsight[]>>((acc, p) => {
    const dateKey = formatDate(p.detected_at);
    const list = acc.get(dateKey) ?? [];
    list.push(p);
    acc.set(dateKey, list);
    return acc;
  }, new Map());

  return (
    <div className="relative pl-6">
      {/* Vertical spine */}
      <div className="absolute left-2 top-2 bottom-2 w-px bg-gray-200" aria-hidden />

      <div className="space-y-6">
        {Array.from(groupedPatterns.entries()).map(([dateLabel, dayPatterns]) => (
          <section key={dateLabel} className="relative">
            {/* Date marker — sits on the spine */}
            <div className="absolute -left-6 top-1 flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-white border-2 border-gray-400" />
              <span className="text-xs font-medium text-gray-500 ml-2">{dateLabel}</span>
            </div>

            <div className="mt-6 space-y-3">
              {dayPatterns.map((pattern) => {
                const Icon = ICONS[pattern.pattern_type] ?? AlertCircle;
                const isResolved = pattern.resolved_at !== null;
                const isMeta = (pattern as PatternInsight & { is_meta?: boolean }).is_meta === true;

                return (
                  <Card
                    key={pattern.id}
                    className={`p-4 relative ${isResolved ? "opacity-60 bg-gray-50" : "bg-white"}`}
                  >
                    {/* Dot on spine for each pattern */}
                    <div
                      className={`absolute -left-[18px] top-5 w-3 h-3 rounded-full ring-2 ${
                        isResolved
                          ? "bg-gray-400 ring-gray-300"
                          : urgencyRingClass(pattern.urgency_score)
                      }`}
                      aria-hidden
                    />

                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          isResolved ? "bg-gray-100 text-gray-500" : "bg-blue-50 text-blue-600"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4 className="font-medium text-sm text-gray-900 truncate">
                            {pattern.pattern_type.replace(/_/g, " ")}
                          </h4>
                          <div className="flex items-center gap-1 shrink-0">
                            {isMeta && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                                META
                              </span>
                            )}
                            {isResolved ? (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                                ✓
                              </span>
                            ) : (
                              <span
                                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${urgencyBadgeClass(pattern.urgency_score)}`}
                              >
                                {pattern.urgency_score}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2 mb-1">
                          {pattern.ai_explanation}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500">
                          <span>{formatDateShort(pattern.detected_at)}</span>
                          {pattern.resolved_at && (
                            <>
                              <span>→</span>
                              <span className="text-green-600">
                                resolved {formatDateShort(pattern.resolved_at)}
                              </span>
                            </>
                          )}
                        </div>
                        {!isResolved &&
                          pattern.quick_actions &&
                          pattern.quick_actions.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {pattern.quick_actions.slice(0, 2).map((action, idx) => (
                                <Button
                                  key={idx}
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-[10px]"
                                  onClick={() => onQuickAction?.(action)}
                                >
                                  {action.label}
                                </Button>
                              ))}
                            </div>
                          )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
