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
