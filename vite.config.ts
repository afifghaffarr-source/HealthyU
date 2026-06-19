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
        start_url: "/dashboard",
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
    process.env.ANALYZE
      ? visualizer({
          filename: "dist/bundle-stats.html",
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
  },
  server: {
    // Defaults that work well locally without the Lovable sandbox.
    port: 8080,
    strictPort: false,
  },
});
