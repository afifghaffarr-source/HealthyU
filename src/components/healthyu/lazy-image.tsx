import { cn } from "@/lib/utils";
import type { ImgHTMLAttributes } from "react";

const ALLOWED_PROXY_HOSTS = new Set<string>(["tpyckpdlzpbfguyrgeuy.supabase.co"]);

/**
 * Build a proxied URL routed through `/api/img/$` (WebP/AVIF negotiation,
 * width resize, CDN cache). Returns the original URL untouched if the host
 * isn't in the allow-list, or if `src` isn't absolute https.
 */
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

type Props = ImgHTMLAttributes<HTMLImageElement> & {
  proxy?: boolean;
  w?: number;
  q?: number;
};

export function LazyImage({ className, alt = "", proxy, w, q, src, ...rest }: Props) {
  const finalSrc = proxy && typeof src === "string" ? proxiedImg(src, { w, q }) : src;
  return (
    <img
      {...rest}
      src={finalSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={cn("bg-muted", className)}
    />
  );
}
