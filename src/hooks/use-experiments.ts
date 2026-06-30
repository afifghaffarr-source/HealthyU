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
 * Import:
 *   import { useExperimentVariant } from "@/hooks/use-experiments";
 */
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  getExperimentVariant,
  type ExperimentVariantResult,
} from "@/features/admin/lib/adminExperiments.functions";

export function useExperimentVariant(key: string): ExperimentVariantResult {
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setHasSession(!!data.session);
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

  // While we wait for the session check (or until the query resolves),
  // return the safe default variant. For anonymous users the RPC also
  // returns variant_a when _user_id is NULL, so this default matches.
  if (!data) return { variant: "a", payload: {} };
  return data;
}
