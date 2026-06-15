/**
 * Build a proxied URL routed through `/api/img/$` (WebP/AVIF negotiation,
 * width resize, CDN cache). Returns the original URL untouched if the host
 * isn't in the allow-list, or if `src` isn't absolute https.
 *
 * Kept in a separate non-tsx file so `LazyImage` (live-image.tsx) can
 * import it without violating `react-refresh/only-export-components`
 * (Fast Refresh needs component-only files).
 */
const ALLOWED_PROXY_HOSTS = new Set<string>(["tpyckpdlzpbfguyrgeuy.supabase.co"]);

export function proxiedImg(src: string, opts?: { w?: number; q?: number }): string {
  try {
    const u = new URL(src);
    if (u.protocol !== "https:" || !ALLOWED_PROXY_HOSTS.has(u.hostname)) return src;
    const params = new URLSearchParams();
    if (opts?.w) params.set("w", String(opts.w));
    if (opts?.q) params.set("q", String(opts.q));
    const qs = params.toString();
    return `/api/img/${encodeURIComponent(src)}${qs ? `?${qs}` : ""}`;
  } catch {
    return src;
  }
}
