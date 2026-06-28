import { useCallback, useEffect, useState } from "react";
import {
  requestAccountDeletion,
  cancelAccountDeletion,
  getDeletionRequest,
} from "@/features/privacy/lib/pdpRights.functions";

/**
 * Exact phrase user must type to confirm account deletion.
 * Displayed in the dialog so the user knows what to type.
 */
export const CONFIRM_DELETE_PHRASE = "HAPUS" as const;

export type DeletionRequestRow = {
  id: string;
  status: string;
  created_at?: string;
  reason?: string | null;
};

export type UseDeleteAccount = {
  /** Pending deletion request from the server, if any. */
  pendingRequest: DeletionRequestRow | null;
  /** Whether the initial fetch is in progress. */
  isPending: boolean;
  /** Whether request/cancel mutation is in flight. */
  isMutating: boolean;
  /** Last successful request id. */
  lastRequestId: string | null;
  /** Last error message, cleared on next success. */
  error: string | null;
  /** Exact phrase user must type to confirm. */
  confirmPhrase: typeof CONFIRM_DELETE_PHRASE;
  /** Returns true when typed value matches confirmPhrase exactly. */
  isConfirmValid: (typed: string) => boolean;
  /** Submit a deletion request with optional reason. */
  request: (reason: string) => Promise<void>;
  /** Cancel a pending deletion request. */
  cancel: () => Promise<void>;
  /** Re-fetch pending state from server. */
  refresh: () => Promise<void>;
};

/**
 * Hook for managing account deletion flow (UU PDP right to erasure).
 *
 * - On mount, fetches existing pending deletion request.
 * - `request` calls server fn, stores last id, surfaces errors.
 * - `cancel` calls server fn, clears errors, refreshes pending state.
 * - `isConfirmValid` enforces exact-phrase match (defense-in-depth against
 *   accidental button clicks bypassing the typed confirmation).
 */
export function useDeleteAccount(): UseDeleteAccount {
  const [pendingRequest, setPendingRequest] = useState<DeletionRequestRow | null>(null);
  const [isPending, setIsPending] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const { request } = await getDeletionRequest();
      setPendingRequest((request as DeletionRequestRow | null) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsPending(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external-store/async-query sync; `useSyncExternalStore` and equivalent restructure would change the API surface
    void refresh();
  }, [refresh]);

  const request = useCallback(
    async (reason: string) => {
      setIsMutating(true);
      setError(null);
      try {
        const { id } = await requestAccountDeletion({ data: { reason } });
        setLastRequestId(id);
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        throw e;
      } finally {
        setIsMutating(false);
      }
    },
    [refresh],
  );

  const cancel = useCallback(async () => {
    setIsMutating(true);
    setError(null);
    try {
      await cancelAccountDeletion();
      setPendingRequest(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      throw e;
    } finally {
      setIsMutating(false);
    }
  }, []);

  const isConfirmValid = useCallback((typed: string) => typed === CONFIRM_DELETE_PHRASE, []);

  return {
    pendingRequest,
    isPending,
    isMutating,
    lastRequestId,
    error,
    confirmPhrase: CONFIRM_DELETE_PHRASE,
    isConfirmValid,
    request,
    cancel,
    refresh,
  };
}
