// Self-managed Vite config for TanStack Start + Cloudflare Pages.
//
// Replaces @lovable.dev/vite-tanstack-config. The lovable config bundled
// tailwind, tsconfig paths, TanStack Router componentTagger, an error logger,
// and Cloudflare Nitro preset. We replicate what's necessary and drop the
// dev-only extras (componentTagger, error logger, sandbox detection).
//
// Plugins needed:
//   - @tanstack/react-start/plugin/vite — framework SSR + client
//   - @vitejs/plugin-react            — React 19 fast refresh
//   - @tailwindcss/vite               — Tailwind v4 (no PostCSS config needed)
//   - vite-tsconfig-paths             — `@/*` import alias
//
// Nitro preset for Cloudflare Pages is set via `tanstackStart` block.
// (Cloudflare Workers/Pages output is the default for Nitro when @tanstack/
// react-start is used.)

import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { visualizer } from "rollup-plugin-visualizer";
import { cloudflare } from "@cloudflare/vite-plugin";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    // @cloudflare/vite-plugin required for Cloudflare Workers deployment per
    // official TanStack Start docs:
    // https://tanstack.com/start/latest/docs/framework/react/guide/hosting#cloudflare-workers
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tsConfigPaths(),
    tailwindcss(),
    tanstackStart({
      // We use src/start.ts for the SSR render entry (start instance,
      // middleware chain, CSP/security headers). This is the runtime
      // config for createStart() — NOT the worker entry.
      // The actual worker entry is configured separately in wrangler.jsonc
      // (`main: "./src/server-entry.ts"`).
      // See https://tanstack.com/start/latest/docs/framework/react/guide/deploying
      server: {
        entry: "start",
      },
      // Sprint 7: Manual vendor chunking (see `build.rollupOptions.manualChunks`
      // below) — splits heavy deps (recharts, jspdf, supabase, dexie, markdown,
      // dompurify) out of the main bundle. Drops main chunk from 853 KB → 541 KB
      // raw (164 KB gzipped).
      //
      // Sprint 8 finding: route-level splitting already happens automatically
      // via TanStack Start's built-in code splitter (it always adds it,
      // regardless of `autoCodeSplitting` in tsr.config.json or vite options).
      // Each route's component is already lazy-loaded on navigation — main
      // bundle 541 KB contains React + TanStack Router/Start/Query + root
      // routeTree metadata, not all 156 route code. Verified by:
      // 1. main bundle has 194 dynamic imports to other chunks
      // 2. source map shows 80% framework, 20% app code
      // 3. `routeTree.gen.ts` (168 KB src) emits per-route lazy chunks
      //    (visible as ?tsr-split=component markers in server bundle)
      // `autoCodeSplitting` flag was tested (via tsr.config.json + vite
      // router option) — produced IDENTICAL bundle hash zqhslL9F.js (553647
      // bytes). Confirms flag is a no-op for TanStack Start.
    }),
    react(),
    // vite-plugin-pwa — PWA shell + Workbox offline cache for user 3G/Ramadhan.
    // Sprint 1a: see docs/HEALTHYU_MASTER_REKOMENDASI_REPO_2026-06-19.md.
    // - Generates /manifest.webmanifest + /sw.js from src/pwa/ + public/manifest.json.
    // - applyRegistration: 'auto' so SW registers on first load (no client hook needed
    //   for the basic install prompt; we still call useRegisterSW for update toast).
    // - apply: 'build' limits plugin to client build only (TanStack Start has both
    //   client + ssr environments; sw generation only happens on client closeBundle).
    // - workbox.navigateFallback: '/index.html' so deep links work offline.
    // - workbox.navigateFallbackDenylist excludes /api/* so mutations stay live.
    // - runtimeCaching: stale-while-revalidate for Google Fonts + supabase.co images
    //   (faster repeat views) + cache-first for our own precached shell.
    // vite-plugin-pwa — PWA shell + Workbox offline cache for user 3G/Ramadhan.
    // Sprint 1a: see docs/HEALTHYU_MASTER_REKOMENDASI_REPO_2026-06-19.md.
    //
    // Strategy decision: we set `strategies: 'injectManifest'` ONLY to enable the
    // vite-plugin-pwa plugin wiring (manifest emission + virtual:pwa-register/react
    // for useRegisterSW). The actual sw.js file is built separately by the
    // `build:sw` postbuild script in package.json via esbuild (24.9 KB output).
    //
    // Why not let vite-plugin-pwa build sw.js itself?
    // - `vite.build()` called internally by the plugin hangs / silently no-ops
    //   under our Vite 7 + TanStack Start + bun 1.2.21 setup (we tested).
    // - `workbox-build` has an ESM/CJS interop bug with brace-expansion@2.x
    //   under bun 1.2.21 (would fail even if vite.build worked).
    // - esbuild handles src/sw.ts cleanly in 61ms — proven output at dist/client/sw.js.
    //
    // Plugin still gives us:
    // - /manifest.webmanifest emitted to dist/client/ via the manifest config below.
    // - virtual:pwa-register/react virtual module → useRegisterSW works in src/components/sw-update-toast.tsx.
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      // srcDir: where the SW source lives (src/sw.ts).
      srcDir: "src",
      // filename: emitted service worker filename in dist/client/.
      filename: "sw.js",
      // manifestFilename: emitted web app manifest filename.
      manifestFilename: "manifest.webmanifest",
      // strategies: injectManifest uses our custom src/sw.ts source.
      // The actual file is built separately via esbuild (see `build:sw` script).
      strategies: "injectManifest",
      // injectManifest.swSrc: path to custom SW source (used by plugin's vite.build,
      // but we bypass that step with esbuild).
      injectManifest: {
        swSrc: "src/sw.ts",
        // injectionPoint='' → SKIP workbox-build.injectManifest() call entirely.
        injectionPoint: "",
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      // includeAssets: explicitly include the static manifest.json + icons in precache.
      includeAssets: ["manifest.json", "icon-192.svg", "icon-512.svg", "robots.txt"],
      // Manifest config (used to generate dist/client/manifest.webmanifest).
      manifest: {
        name: "HealthyU — Sahabat Sehat AI",
        short_name: "HealthyU",
        description: "Diet, puasa, dan kesehatan holistik berbasis AI untuk Indonesia.",
        lang: "id-ID",
        dir: "ltr",
        // start_url: where the PWA opens after install.
        // Use /resep (the public hub) so anon users don't get bounced to /auth.
        // Authenticated users can navigate to /dashboard from the top nav.
        start_url: "/resep",
        scope: "/",
        display: "standalone",
        background_color: "#FBF8F1",
        theme_color: "#6B8E5A",
        orientation: "portrait",
        categories: ["health", "fitness", "lifestyle", "medical"],
        id: "/?source=pwa",
        icons: [
          {
            src: "/icon-192.svg",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "/icon-512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "/icon-512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "maskable",
          },
        ],
      },
      // Disable in dev to avoid SW caching during HMR.
      devOptions: {
        enabled: false,
        type: "module",
      },
    }),
    // Bundle analyzer (optional; enable with `ANALYZE=1 bun run build`)
    // Sprint 8: emit per-environment stats (client + ssr) so we can see what
    // actually ships to the browser. Default visualizer filename overwrites
    // itself on each vite environment build, hiding the client tree.
    process.env.ANALYZE
      ? visualizer({
          filename: process.env.ANALYZE_FILENAME ?? "dist/bundle-stats.html",
          template: "treemap",
          gzipSize: true,
          brotliSize: true,
          open: false,
        })
      : null,
  ].filter(Boolean),
  environments: {
    // The worker entry is set via wrangler.jsonc `main: "./src/server-entry.ts"`.
    // The @cloudflare/vite-plugin bundles that file as the actual worker.
    // We do NOT override ssr.rollupOptions.input here because:
    //  (a) The TanStack Start plugin uses its own entry for the SSR render.
    //  (b) The CF worker entry is independent — vite outputs it to
    //      dist/server/ based on the `main` field.
  },
  build: {
    // LIGHTHOUSE-002 valid-source-maps fix: Lighthouse needs source maps to
    // trace minified code back to source. Without this, lhci 'valid-source-maps'
    // audit fails. Trade-off: +30-40% dist size (CF can serve .map files
    // separately or strip via transform rules).
    sourcemap: true,
    // Sprint 7: Manual chunking for heavy vendor deps that were previously
    // bundled into the main 853 KB chunk. Putting them in their own chunks
    // means:
    //   * The main bundle drops to a much smaller size for first paint.
    //   * Vendor chunks are cached independently (longer cache TTL OK).
    //   * Parallel downloads on HTTP/2 / HTTP/3.
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return undefined;
          // Charts (recharts + d3 deps) — heavy, lazy-loaded on dashboard/reports.
          if (id.includes("recharts") || id.includes("d3-") || id.includes("victory-vendor")) {
            return "vendor-charts";
          }
          // PDF + screenshot (only used by reports export flow).
          if (id.includes("jspdf") || id.includes("html2canvas")) {
            return "vendor-pdf";
          }
          // Markdown rendering (used by articles).
          if (
            id.includes("marked") ||
            id.includes("markdown-it") ||
            id.includes("remark") ||
            id.includes("micromark") ||
            id.includes("mdast-util")
          ) {
            return "vendor-markdown";
          }
          // DOMPurify (sanitize HTML — paired with markdown).
          if (id.includes("dompurify") || id.includes("purify")) {
            return "vendor-purify";
          }
          // IndexedDB wrapper (Dexie — used for offline cache).
          if (id.includes("dexie")) {
            return "vendor-dexie";
          }
          // Supabase client + postgrest deps.
          if (id.includes("@supabase") || id.includes("postgrest")) {
            return "vendor-supabase";
          }
          // React + react-dom stay in main (required at first paint, splitting
          // only adds HTTP requests without reducing initial load — verified).
          return undefined;
        },
      },
    },
  },
  server: {
    // Defaults that work well locally without the Lovable sandbox.
    port: 8080,
    strictPort: false,
  },
});
