/**
 * Meta-Pattern Milestone Badges
 *
 * Derives earned badges from existing pattern_insights rows (no new tables).
 *
 * Sprint 17 - First-time meta-pattern celebration.
 *
 * ponytail: zero DB schema. "Celebrated" state lives in localStorage
 * because (1) it's per-device cosmetic, (2) no analytics attached, (3) the
 * DB row itself is the source of truth for which combos a user has seen.
 * Switch to a profile column if/when we add notification preferences.
 */

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Award, Trophy, Sparkles } from "lucide-react";
import { track } from "@/lib/errorReporting";
import type { PatternInsight } from "../types/pattern";

interface MetaBadge {
  id: string;
  title: string;
  description: string;
  emoji: string;
  earnedAt: string | null;
}

// Per-ComboBadge descriptors. IDs must match MetaPatternType values stored
// in pattern_insights.metapattern_id column.
const BADGE_CATALOG: Array<Omit<MetaBadge, "earnedAt">> = [
  {
    id: "stress_late_night_combo",
    title: "Pengatasi Stress Malam",
    description: "Berhasil mengidentifikasi pola stress + makan larut malam",
    emoji: "🌙",
  },
  {
    id: "weekend_indulgence_combo",
    title: "Master Weekend",
    description: "Berhasil mendeteksi pola makan berlebihan weekend",
    emoji: "🎉",
  },
  {
    id: "emotional_mood_cycle",
    title: "Mood Tracker",
    description: "Berhasil mengidentifikasi pola makan emosional",
    emoji: "💭",
  },
];

const STORAGE_KEY = "healthyu:meta-badges-celebrated";

function loadCelebrated(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function saveCelebrated(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // localStorage may be unavailable (e.g. private mode) — silently degrade.
  }
}

interface MilestoneBadgesProps {
  patterns: PatternInsight[];
  /** When true, show inline celebration banner for newly-unlocked badges. */
  showBanner?: boolean;
}

export function MilestoneBadges({ patterns, showBanner = true }: MilestoneBadgesProps) {
  // First-ever rendering: read which combos the user has "celebrated" so we
  // never replay a confetti modal. Hydration-safe: defer to mounted effect.
  const [celebrated, setCelebrated] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCelebrated(loadCelebrated());
    setHydrated(true);
  }, []);

  // Derive badges from existing pattern rows — earned iff meta row exists.
  const badges = useMemo<MetaBadge[]>(() => {
    return BADGE_CATALOG.map((b) => {
      const match = patterns.find((p) => p.is_meta && p.metapattern_id === b.id);
      return { ...b, earnedAt: match?.detected_at ?? null };
    });
  }, [patterns]);

  // Detect badges that newly became earned (this session) for the celebration banner.
  const newCelebrations = useMemo(() => {
    if (!hydrated) return [] as MetaBadge[];
    return badges.filter((b) => b.earnedAt && !celebrated.includes(b.id));
  }, [badges, celebrated, hydrated]);

  // Mark once celebrated so banner only fires once per badge per device.
  useEffect(() => {
    if (!hydrated || newCelebrations.length === 0) return;
    const next = Array.from(new Set([...celebrated, ...newCelebrations.map((b) => b.id)]));
    saveCelebrated(next);
    setCelebrated(next);
    // Telemetry (Sprint 19): one event per newly-observed badge in this
    // session. Server-side we can then derive "first-time combos achieved
    // per user" funnel.
    for (const b of newCelebrations) {
      track("dashboard.badge_celebrated.seen", {
        badge_id: b.id,
        badge_title: b.title,
      });
    }
  }, [newCelebrations, hydrated, celebrated]);

  const earnedCount = badges.filter((b) => b.earnedAt).length;

  return (
    <div className="space-y-3">
      {showBanner && newCelebrations.length > 0 && (
        <Card className="p-4 border-l-4 border-amber-500 bg-gradient-to-br from-amber-50 to-yellow-50">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-amber-500 p-2 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-amber-900">Badge baru terbuka! 🎊</h3>
              </div>
              <p className="text-sm text-amber-800 mb-2">
                Sistem mendeteksi pola gabungan pertamamu. Lihat di bawah:
              </p>
              <ul className="space-y-1">
                {newCelebrations.map((b) => (
                  <li key={b.id} className="text-sm text-amber-900 flex items-center gap-2">
                    <span className="text-lg">{b.emoji}</span>
                    <span className="font-medium">{b.title}</span>
                    <span className="text-xs text-amber-700">— baru!</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="h-4 w-4 text-amber-500" />
          <h3 className="font-semibold text-sm text-gray-900">Meta-Pattern Badges</h3>
          <span className="text-xs text-gray-500">
            ({earnedCount}/{badges.length})
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {badges.map((badge) => {
            const earned = !!badge.earnedAt;
            return (
              <Card
                key={badge.id}
                className={`p-3 text-center ${
                  earned
                    ? "bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-300"
                    : "bg-gray-50 opacity-60"
                }`}
              >
                <div className="text-3xl mb-1">{earned ? badge.emoji : "🔒"}</div>
                <div className="text-xs font-medium text-gray-900 mb-0.5 line-clamp-1">
                  {badge.title}
                </div>
                <div className="text-[10px] text-gray-600 line-clamp-2">
                  {earned ? badge.description : "Belum terdeteksi"}
                </div>
                {earned && (
                  <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-amber-700">
                    <Award className="h-3 w-3" />
                    Earned
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
