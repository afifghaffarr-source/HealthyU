/**
 * Single source of truth untuk brand & domain config.
 * Pakai ini di SEO, schema.org, manifest, push notification, share text, dll.
 */
export const APP_CONFIG = {
  name: "HealthyU",
  shortName: "HealthyU",
  siteUrl: "https://healthyu.id",
  description:
    "AI nutrition coach untuk Indonesia: diet, puasa, jadwal sholat, dan HealthyU AI Coach.",
  supportEmail: "support@healthyu.id",
  twitterHandle: "@healthyu_id",
  defaultOgImage: "/icon-512.svg",
} as const;

export type AppConfig = typeof APP_CONFIG;
