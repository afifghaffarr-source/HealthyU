import { APP_CONFIG } from "@/config/app";

export const SITE_URL = APP_CONFIG.siteUrl;
export const SITE_NAME = APP_CONFIG.name;

export function canonical(path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${clean === "/" ? "" : clean}`;
}

export function ogImage(path = "/icon-512.svg"): string {
  return `${SITE_URL}${path}`;
}