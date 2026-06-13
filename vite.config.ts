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

export default defineConfig({
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    tanstackStart({
      // We render through src/server.ts (custom SSR + error handler + CSP).
      // See https://tanstack.com/start/latest/docs/framework/react/guide/deploying
      server: {
        entry: "src/server.ts",
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
  server: {
    // Defaults that work well locally without the Lovable sandbox.
    port: 8080,
    strictPort: false,
  },
});
