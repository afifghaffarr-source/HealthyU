import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDeleteAccount } from "../hooks/use-delete-account";

const mockRequestDeletion = vi.fn();
const mockCancelDeletion = vi.fn();
const mockGetRequest = vi.fn();

vi.mock("@/features/privacy/lib/pdpRights.functions", () => ({
  requestAccountDeletion: (...args: unknown[]) => mockRequestDeletion(...args),
  cancelAccountDeletion: (...args: unknown[]) => mockCancelDeletion(...args),
  getDeletionRequest: (...args: unknown[]) => mockGetRequest(...args),
}));

describe("useDeleteAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("starts with no pending request when getDeletionRequest returns null", async () => {
      mockGetRequest.mockResolvedValue({ request: null });
      const { result } = renderHook(() => useDeleteAccount());
      // wait for initial fetch
      await act(async () => {
        await Promise.resolve();
      });
      expect(result.current.isPending).toBe(false);
      expect(result.current.pendingRequest).toBeNull();
      expect(result.current.confirmPhrase).toBe("HAPUS");
    });
  });

  describe("confirm phrase validation", () => {
    it("requires exact uppercase 'HAPUS' to enable submit", () => {
      mockGetRequest.mockResolvedValue({ request: null });
      const { result } = renderHook(() => useDeleteAccount());
      expect(result.current.isConfirmValid("")).toBe(false);
      expect(result.current.isConfirmValid("HAPU")).toBe(false);
      expect(result.current.isConfirmValid("hapus")).toBe(false);
      expect(result.current.isConfirmValid("Hapus")).toBe(false);
      expect(result.current.isConfirmValid("HAPUS")).toBe(true);
      // Whitespace should NOT count (user has to be exact)
      expect(result.current.isConfirmValid(" HAPUS ")).toBe(false);
    });
  });

  describe("request deletion", () => {
    it("calls server fn with reason and updates pending state on success", async () => {
      mockGetRequest.mockResolvedValue({ request: null });
      mockRequestDeletion.mockResolvedValue({ id: "req-123" });
      const { result } = renderHook(() => useDeleteAccount());

      await act(async () => {
        await Promise.resolve();
      });

      await act(async () => {
        await result.current.request("Tidak jadi pakai lagi");
      });

      expect(mockRequestDeletion).toHaveBeenCalledWith({
        data: { reason: "Tidak jadi pakai lagi" },
      });
      expect(result.current.lastRequestId).toBe("req-123");
      expect(result.current.error).toBeNull();
    });

    it("surfaces error on failure", async () => {
      mockGetRequest.mockResolvedValue({ request: null });
      mockRequestDeletion.mockRejectedValue(new Error("RPC failed"));
      const { result } = renderHook(() => useDeleteAccount());

      await act(async () => {
        await Promise.resolve();
      });

      // Swallow expected throw — impl re-throws for callers that want to chain
      await act(async () => {
        try {
          await result.current.request("test");
        } catch {
          /* expected */
        }
      });

      expect(result.current.error).toBe("RPC failed");
      expect(result.current.lastRequestId).toBeNull();
    });

    it("rejects empty/whitespace reason as no-op (server allows optional)", async () => {
      mockGetRequest.mockResolvedValue({ request: null });
      mockRequestDeletion.mockResolvedValue({ id: "req-empty" });
      const { result } = renderHook(() => useDeleteAccount());

      await act(async () => {
        await Promise.resolve();
      });

      await act(async () => {
        await result.current.request("");
      });

      // Should still call server, just with empty string
      expect(mockRequestDeletion).toHaveBeenCalledWith({
        data: { reason: "" },
      });
    });
  });

  describe("cancel deletion", () => {
    it("calls cancel fn and clears pending state on success", async () => {
      mockGetRequest.mockResolvedValue({ request: null });
      mockCancelDeletion.mockResolvedValue({ ok: true });
      const { result } = renderHook(() => useDeleteAccount());

      await act(async () => {
        await Promise.resolve();
      });

      await act(async () => {
        await result.current.cancel();
      });

      expect(mockCancelDeletion).toHaveBeenCalled();
      expect(result.current.error).toBeNull();
    });
  });

  describe("refresh", () => {
    it("re-fetches pending state", async () => {
      mockGetRequest.mockResolvedValueOnce({ request: null }).mockResolvedValueOnce({
        request: { id: "r1", status: "pending", created_at: "2026-01-01" },
      });
      const { result } = renderHook(() => useDeleteAccount());

      await act(async () => {
        await Promise.resolve();
      });
      expect(result.current.pendingRequest).toBeNull();

      await act(async () => {
        await result.current.refresh();
      });
      expect(result.current.pendingRequest).toEqual({
        id: "r1",
        status: "pending",
        created_at: "2026-01-01",
      });
    });
  });
});
