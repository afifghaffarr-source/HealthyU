/**
 * Pattern Insight Card Component
 *
 * Displays top eating pattern on dashboard with:
 * - Pattern icon + title
 * - AI explanation
 * - Quick action buttons
 * - Dismiss option
 */

import {
  AlertCircle,
  Coffee,
  Moon,
  Heart,
  Users,
  Calendar,
  MapPin,
  Apple,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { PatternInsight, QuickAction } from "../types/pattern";
import { calculateTrend, getTrendEmoji, getTrendColor } from "../lib/patternTrends";
import { usePatternFeedback } from "../hooks/usePatternFeedback";
import { useState } from "react";

interface PatternInsightCardProps {
  pattern: PatternInsight;
  onDismiss?: (patternId: string) => void;
  onQuickAction?: (action: QuickAction) => void;
}

const PATTERN_ICONS: Record<string, typeof AlertCircle> = {
  skip_breakfast: Coffee,
  late_night_eating: Moon,
  stress_eating: Heart,
  gathering_overeat: Users,
  busy_day_skips: Calendar,
  warung_overeat: MapPin,
  eating_not_hungry: Apple,
  // Add more mappings as needed
};

const PATTERN_TITLES: Record<string, string> = {
  skip_breakfast: "Skip Breakfast Pattern",
  late_night_eating: "Late-Night Eating",
  irregular_meals: "Irregular Meal Times",
  stress_eating: "Stress Eating",
  mood_binges: "Mood-Driven Binges",
  celebration_overeat: "Celebration Overeating",
  gathering_overeat: "Social Gathering Overeating",
  peer_pressure: "Peer Pressure Eating",
  weekend_splurge: "Weekend Splurge",
  sugar_crashes: "Sugar Crashes",
  specific_food_triggers: "Food Triggers",
  night_cravings: "Night Cravings",
  busy_day_skips: "Busy Day Meal Skips",
  rush_meals: "Rush Meals",
  workday_weekend_gap: "Weekday vs Weekend Gap",
  warung_overeat: "Warung Overeating",
  home_vs_outside: "Home vs Outside Eating",
  workplace_cafeteria: "Workplace Cafeteria",
  eating_not_hungry: "Eating When Not Hungry",
  ignoring_fullness: "Ignoring Fullness",
  hunger_disconnect: "Hunger Signal Disconnect",
};

export function PatternInsightCard({ pattern, onDismiss, onQuickAction }: PatternInsightCardProps) {
  const Icon = PATTERN_ICONS[pattern.pattern_type] || AlertCircle;
  const title = PATTERN_TITLES[pattern.pattern_type] || pattern.pattern_type;
  const trend = calculateTrend(pattern);
  const feedbackMutation = usePatternFeedback();
  const [feedbackGiven, setFeedbackGiven] = useState(!!pattern.user_feedback);

  const handleFeedback = async (helpful: boolean) => {
    try {
      await feedbackMutation.mutateAsync({ patternId: pattern.id, helpful });
      setFeedbackGiven(true);
    } catch (err) {
      console.error("Feedback submit failed:", err);
    }
  };

  const urgencyColor =
    pattern.urgency_score >= 85
      ? "text-red-600"
      : pattern.urgency_score >= 70
        ? "text-orange-600"
        : "text-yellow-600";

  const urgencyBg =
    pattern.urgency_score >= 85
      ? "bg-red-50 border-red-200"
      : pattern.urgency_score >= 70
        ? "bg-orange-50 border-orange-200"
        : "bg-yellow-50 border-yellow-200";

  return (
    <Card className={`p-4 border-l-4 ${urgencyBg}`}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className={`p-2 rounded-lg ${urgencyColor} bg-white`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <span className={`text-xs font-medium px-2 py-1 rounded ${urgencyColor} bg-white`}>
              {pattern.urgency_score}/100
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-1">{pattern.ai_explanation}</p>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-gray-500">
              {pattern.occurrence_count}x dalam 14 hari terakhir
            </span>
            {trend.daysTracked >= 7 && (
              <span className={`font-medium ${getTrendColor(trend.status)}`}>
                {getTrendEmoji(trend.status)} {Math.abs(trend.improvementPercent)}%{" "}
                {trend.status === "improving"
                  ? "membaik"
                  : trend.status === "worsening"
                    ? "memburuk"
                    : "stabil"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Recommendation */}
      {pattern.ai_recommendation && (
        <div className="mb-3 p-2 bg-white rounded text-sm text-gray-700">
          💡 <span className="font-medium">Saran:</span> {pattern.ai_recommendation}
        </div>
      )}

      {/* Quick Actions */}
      {pattern.quick_actions && pattern.quick_actions.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {pattern.quick_actions.slice(0, 3).map((action, idx) => (
            <Button
              key={idx}
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => onQuickAction?.(action)}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}

      {/* Feedback */}
      {!feedbackGiven && (
        <div className="flex items-center gap-2 mb-3 pb-3 border-b">
          <span className="text-xs text-gray-600">Apakah ini membantu?</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => handleFeedback(true)}
            disabled={feedbackMutation.isPending}
          >
            <ThumbsUp className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => handleFeedback(false)}
            disabled={feedbackMutation.isPending}
          >
            <ThumbsDown className="h-3 w-3" />
          </Button>
        </div>
      )}
      {feedbackGiven && (
        <div className="mb-3 pb-3 border-b text-xs text-green-600">
          ✓ Terima kasih atas feedbacknya!
        </div>
      )}

      {/* Dismiss */}
      <div className="flex items-center justify-between pt-2">
        <button
          className="text-xs text-gray-500 hover:text-gray-700"
          onClick={() => onDismiss?.(pattern.id)}
        >
          Sudah saya handle ✓
        </button>
        <a
          href="/profile/insights"
          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          Lihat semua insight →
        </a>
      </div>
    </Card>
  );
}

/**
 * Loading skeleton for pattern card
 */
export function PatternInsightCardSkeleton() {
  return (
    <Card className="p-4 border-l-4 bg-gray-50 border-gray-200">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 bg-gray-200 rounded-lg animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
          <div className="h-3 bg-gray-200 rounded w-full animate-pulse" />
          <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="h-8 bg-gray-200 rounded w-24 animate-pulse" />
        <div className="h-8 bg-gray-200 rounded w-24 animate-pulse" />
      </div>
    </Card>
  );
}

/**
 * Empty state when no patterns detected
 */
export function PatternInsightEmpty() {
  return (
    <Card className="p-6 text-center border-l-4 bg-green-50 border-green-200">
      <div className="text-4xl mb-2">🎉</div>
      <h3 className="font-semibold text-gray-900 mb-1">Semuanya on track!</h3>
      <p className="text-sm text-gray-600">
        Tidak ada pola diet yang perlu diperbaiki. Pertahankan kebiasaan baikmu!
      </p>
    </Card>
  );
}
