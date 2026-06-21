import { APP_CONFIG } from "@/config/app";

export const SITE_URL = APP_CONFIG.siteUrl;
export const SITE_NAME = APP_CONFIG.name;

/**
 * Site locale for og:locale + hreflang.
 * HealthyU is Indonesian-only, so all pages declare id-ID.
 */
export const SITE_LOCALE = "id-ID" as const;

/**
 * Available hreflang variants.
 *
 * Currently only "id-ID" (Indonesian — Indonesia). The "x-default"
 * declaration points to the same URL as a fallback for users whose
 * language doesn't match any declared variant.
 *
 * If we add an English version later, add "en-US" here and update
 * `hreflangAlternates` accordingly.
 */
export const HREFLANG_VARIANTS = ["id-ID"] as const;
export type HreflangVariant = (typeof HREFLANG_VARIANTS)[number];

export function canonical(path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${clean === "/" ? "" : clean}`;
}

export function ogImage(path = "/icon-512.svg"): string {
  return `${SITE_URL}${path}`;
}

/**
 * Build the og:image URL for a given content type + slug.
 * Used by detail routes (recipe / article) to point at the pre-generated
 * 1200x630 PNG card (see scripts/generate-og-images.mjs).
 *
 * Falls back to /og/site.png if the slug is missing.
 */
export function ogImageFor(kind: "recipes" | "articles", slug?: string | null): string {
  const path = slug ? `/og/${kind}/${slug}.png` : "/og/site.png";
  return ogImage(path);
}

/**
 * Generate hreflang alternate links for a given path.
 *
 * Returns the `id-ID` variant + an `x-default` fallback. Even though
 * HealthyU is single-language today, declaring `x-default` is a Google
 * best practice and makes adding `en-US` (or other locales) trivial
 * later.
 *
 * Usage in a route's `head.links`:
 *   links: [
 *     { rel: "canonical", href: canonical("/resep/$slug") },
 *     ...hreflangAlternates("/resep/$slug"),
 *   ]
 */
export function hreflangAlternates(
  path: string,
): Array<{ rel: "alternate"; hreflang: string; href: string }> {
  const url = canonical(path);
  const links: Array<{ rel: "alternate"; hreflang: string; href: string }> = [];
  for (const variant of HREFLANG_VARIANTS) {
    links.push({ rel: "alternate", hreflang: variant, href: url });
  }
  // x-default always points to the primary locale URL (id-ID).
  // For multi-locale sites, x-default should point to the language
  // picker or the primary locale. HealthyU only has id-ID, so same URL.
  links.push({ rel: "alternate", hreflang: "x-default", href: url });
  return links;
}
