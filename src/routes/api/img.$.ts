import { createFileRoute } from "@tanstack/react-router";

// Allow-list of upstream hosts. Anything else returns 403 (SSRF guard).
const ALLOWED_HOSTS = new Set<string>([
  "tpyckpdlzpbfguyrgeuy.supabase.co",
]);

export const Route = createFileRoute("/api/img/$")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const raw = params._splat ?? "";
        let src: URL;
        try {
          src = new URL(raw);
        } catch {
          return new Response("Bad URL", { status: 400 });
        }
        if (src.protocol !== "https:" || !ALLOWED_HOSTS.has(src.hostname)) {
          return new Response("Forbidden host", { status: 403 });
        }

        const u = new URL(request.url);
        const w = Number(u.searchParams.get("w")) || undefined;
        const q = Number(u.searchParams.get("q")) || 80;
        const accept = request.headers.get("accept") ?? "";
        const wantsWebp = accept.includes("image/webp");
        const wantsAvif = accept.includes("image/avif");
        const format = wantsAvif ? "avif" : wantsWebp ? "webp" : undefined;

        // Cloudflare Image Resizing via `cf.image` — silently ignored on
        // environments without it enabled (route still acts as a cache layer).
        const init: RequestInit & {
          cf?: { image?: Record<string, unknown>; cacheTtl?: number };
        } = {
          cf: {
            cacheTtl: 60 * 60 * 24 * 30,
            image: {
              ...(format ? { format } : {}),
              ...(w ? { width: w } : {}),
              quality: q,
              fit: "scale-down",
            },
          },
        };

        let upstream: Response;
        try {
          upstream = await fetch(src.toString(), init);
        } catch {
          return new Response("Upstream fetch failed", { status: 502 });
        }
        if (!upstream.ok) {
          return new Response("Upstream error", { status: upstream.status });
        }

        const headers = new Headers(upstream.headers);
        headers.set("Cache-Control", "public, max-age=86400, s-maxage=2592000, immutable");
        headers.set("Vary", "Accept");
        return new Response(upstream.body, { status: 200, headers });
      },
    },
  },
});