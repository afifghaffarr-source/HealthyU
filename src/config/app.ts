/**
 * Single source of truth untuk brand & domain config.
 * Pakai ini di SEO, schema.org, manifest, push notification, share text, dll.
 */
export const APP_CONFIG = {
  name: "HealthyU",
  shortName: "HealthyU",
  // Domain aktif: healthyu.web.id (sesuai wrangler.jsonc routes).
  // Bisa di-override via VITE_SITE_URL di wrangler.jsonc (build-time).
  // Fallback ke healthyu.web.id untuk konsistensi.
  siteUrl: import.meta.env.VITE_SITE_URL || "https://healthyu.web.id",
  description:
    "AI nutrition coach untuk Indonesia: diet, puasa, jadwal sholat, dan HealthyU AI Coach.",
  supportEmail: "support@healthyu.id",
  twitterHandle: "@healthyu_id",
  defaultOgImage: "/icon-512.svg",
} as const;

export type AppConfig = typeof APP_CONFIG;
