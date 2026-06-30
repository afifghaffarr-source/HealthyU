/**
 * useI18nOverride — fetch DB-backed translation overrides for the current
 * locale. Merges with the bundled i18n.tsx automatically by `useTranslation`
 * in @/lib/i18n.
 *
 * For now, the i18n provider reads the bundled translation directly. This
 * hook exposes the raw DB override map for admin tools or for components
 * that need to know if a string is overridden (e.g. "edited" badge).
 */
import { useQuery } from "@tanstack/react-query";
import { getEffectiveOverrides } from "@/features/admin/lib/adminI18n.functions";
import type { Locale } from "@/lib/i18n";

export function useI18nOverrideMap(locale: Locale) {
  const { data } = useQuery({
    queryKey: ["i18nOverrides", locale],
    queryFn: () => getEffectiveOverrides({ data: { locale } }),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });
  return data ?? {};
}
