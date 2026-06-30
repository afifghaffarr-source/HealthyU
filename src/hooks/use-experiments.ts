/**
 * useExperimentVariant — TanStack Query wrapper around the public
 * getExperimentVariant server fn. Used by UI components to read A/B
 * test variants deterministically assigned server-side (Sprint 58-E).
 *
 * Default behavior:
 *  - 5min staleTime (experiments change rarely; refresh blows cache).
 *  - Anonymous users (no session) still call the RPC — the
 *    get_experiment_variant SECURITY DEFINER fn returns variant_a when
 *    _user_id is NULL, so the result is always well-defined.
 *  - Hard fallback: if the server fn throws (e.g. RPC missing), return
 *    the safe default { variant: "a", payload: {} } instead of crashing.
 *
 * Sprint 58-I — also fires an impression event (once per mount per key)
 * via trackExperimentEvent → error_reports telemetry. No new tables.
 *
 * Import:
 *   import { useExperimentVariant } from "@/hooks/use-experiments";
 */
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  getExperimentVariant,
  trackExperimentEvent,
  type ExperimentVariantResult,
} from "@/features/admin/lib/adminExperiments.functions";

/**
 * Stable per-browser session id. Persists across visits (localStorage).
 * Used to dedup impressions + bucket conversion events anonymously.
 */
export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  const KEY = "healthyu-experiment-session";
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return `fallback-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function useExperimentVariant(key: string): ExperimentVariantResult {
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const impressionFired = useRef(false);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) {
        setHasSession(!!data.session);
        setUserId(data.session?.user?.id ?? null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const enabled = hasSession !== null;

  const { data } = useQuery<ExperimentVariantResult>({
    queryKey: ["experiment", key],
    queryFn: () => getExperimentVariant({ data: { key, userId: null } }),
    staleTime: 5 * 60_000, // 5 min — experiments don't change often
    gcTime: 30 * 60_000,
    retry: 1,
    enabled,
  });

  // Fire impression once per mount per key. ponytail: piggyback on
  // error_reports (no new table, no new endpoint).
  useEffect(() => {
    if (!data || impressionFired.current) return;
    impressionFired.current = true;
    const sessionId = getOrCreateSessionId();
    // Fire-and-forget — never block UI on tracking.
    void trackExperimentEvent({
      data: {
        event: "impression",
        key,
        variant: data.variant,
        sessionId,
        userId,
      },
    }).catch(() => {
      /* swallow — telemetry must not crash the app */
    });
  }, [data, key, userId]);

  // While we wait for the session check (or until the query resolves),
  // return the safe default variant. For anonymous users the RPC also
  // returns variant_a when _user_id is NULL, so this default matches.
  if (!data) return { variant: "a", payload: {} };
  return data;
}

/**
 * useExperimentConversion — fires a conversion event for a given
 * experiment key + variant. Returns a stable callback. Use onClick of
 * the variant CTA to measure CTR.
 */
export function useExperimentConversion(
  key: string,
  variant: "a" | "b",
  conversionType = "click",
): () => void {
  return () => {
    const sessionId = getOrCreateSessionId();
    void supabase.auth.getSession().then(({ data: sess }) => {
      void trackExperimentEvent({
        data: {
          event: "conversion",
          key,
          variant,
          sessionId,
          conversionType,
          userId: sess?.session?.user?.id ?? null,
        },
      }).catch(() => {
        /* swallow */
      });
    });
  };
}
