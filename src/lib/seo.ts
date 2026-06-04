export const SITE_URL = "https://healthyu.id";
export const SITE_NAME = "HealthyU";

export function canonical(path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${clean === "/" ? "" : clean}`;
}

export function ogImage(path = "/icon-512.svg"): string {
  return `${SITE_URL}${path}`;
}