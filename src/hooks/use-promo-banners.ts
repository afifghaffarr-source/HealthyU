/**
 * use-promo-banners — client hooks for banners + promo redemption.
 *
 * - useActiveBanners(placement?) — TanStack Query calling getActiveBanners
 *   (SECURITY DEFINER RPC). 60s staleTime, 5min gc.
 * - useRedeemPromo() — useMutation calling redeemPromoCode. Returns
 *   { mutate, isPending, data, error } per TanStack Query convention.
 */
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  getActiveBanners,
  redeemPromoCode,
  type ActiveBanner,
  type RedeemResult,
} from "@/features/admin/lib/adminPromo.functions";

/**
 * Fetch active banners from the getActiveBanners RPC, filtered by placement
 * when supplied. Caches for 60s (admin edits propagate within 1 minute).
 */
export function useActiveBanners(placement?: "top" | "middle" | "bottom") {
  return useQuery<ActiveBanner[]>({
    queryKey: ["activeBanners", placement ?? "all"],
    queryFn: () => getActiveBanners({ data: { placement } }),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

/**
 * Redeem a promo code via the redeem_promo SECURITY DEFINER RPC. The RPC is
 * idempotent per (code, user) — duplicate redemptions return a safe message.
 */
type RedeemInput = { code: string };

export function useRedeemPromo() {
  return useMutation<RedeemResult, Error, RedeemInput>({
    mutationFn: (input: RedeemInput) => redeemPromoCode({ data: { code: input.code } }),
  });
}
