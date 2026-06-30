/**
 * useFeatureFlag — reads a boolean config key from app_config and falls
 * back to a sensible default. Used by feature gates across the app.
 *
 * Caches in localStorage for 60s + react-query staleTime to avoid DB
 * roundtrips on every render. The cache is keyed by (configKey) so each
 * feature flag is fetched independently.
 *
 * Server fn: readPublicConfig(key) — admin-readable (RLS allows select).
 * Non-admin users also need the value, so the policy lets everyone read
 * `value` (but not write).
 */
import { useQuery } from "@tanstack/react-query";
import { readPublicConfig } from "@/features/admin/lib/adminConfig.functions";

export type FeatureFlagKey =
  | "maintenance.enabled"
  | "feature.ai_coach"
  | "feature.scan_label"
  | "feature.scan_photo"
  | "feature.fasting"
  | "feature.gamification";

export function useFeatureFlag(key: FeatureFlagKey, defaultValue: boolean = true): boolean {
  const { data } = useQuery({
    queryKey: ["featureFlag", key],
    queryFn: () => readPublicConfig({ data: { key, defaultValue } }),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
  if (data === undefined || data === null) return defaultValue;
  return data === true;
}

/**
 * useAppConfig — read any config key, returns the typed value or the
 * supplied default. Server fn is admin-readable.
 */
export function useAppConfig<T = unknown>(key: string, defaultValue: T): T {
  const { data } = useQuery({
    queryKey: ["appConfig", key],
    queryFn: () => readPublicConfig({ data: { key, defaultValue } }),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
  if (data === undefined || data === null) return defaultValue;
  return data as T;
}

/**
 * useAppConfigMap — batch fetch multiple keys in one call.
 */
export function useAppConfigMap(keys: string[]): Record<string, unknown> {
  const { data } = useQuery({
    queryKey: ["appConfigBatch", keys],
    queryFn: async () => {
      const result: Record<string, unknown> = {};
      for (const k of keys) {
        result[k] = await readPublicConfig({ data: { key: k } });
      }
      return result;
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    enabled: keys.length > 0,
  });
  return data ?? {};
}
