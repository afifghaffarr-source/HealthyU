export type ConfidenceTier = "high" | "medium" | "low";

/**
 * Map a 0-1 confidence score to a tier label. Kept in a separate non-tsx
 * file so `ConfidenceBadge` (confidence-badge.tsx) can import it without
 * violating `react-refresh/only-export-components`.
 */
export function tierFromScore(score: number | null | undefined): ConfidenceTier {
  const n = Number(score ?? 0);
  if (n >= 0.8) return "high";
  if (n >= 0.5) return "medium";
  return "low";
}
