/**
 * Vite plugin: bridge `dist/server/.dev.vars` into the SSR runtime.
 *
 * Why:
 * - `@cloudflare/vite-plugin` writes `dist/server/.dev.vars` at build time
 *   with the values from `wrangler.jsonc vars` + `secrets.required`. The
 *   plugin's `configurePreviewServer` reads the file (visible in its
 *   startup log: "Using secrets defined in dist/server/.dev.vars") but
 *   does NOT inject them into the SSR `fetch(request, env, ctx)` handler.
 * - The TanStack Start worker entry exports a fetch that expects env as
 *   its 2nd argument. Vite preview calls it with one arg (just request),
 *   so `env` is undefined at request time.
 * - `getEnv()` in src/lib/cloudflare-env.server.ts falls back to
 *   `process.env`, but in vite preview's SSR runtime, `process.env` is
 *   empty (or has only a few vars) because the dev vars live in the
 *   `.dev.vars` file, not in the parent shell environment.
 * - Result: routes that need Supabase data (e.g. /artikel, /faq) return
 *   500 in vite preview.
 *
 * What this plugin does:
 * 1. At preview server startup, reads `dist/server/.dev.vars` and parses
 *    it (format: `KEY='value'`).
 * 2. Stores the parsed vars on `globalThis.__CF_DEV_VARS__` so the same
 *    V8 isolate's modules can read them at SSR request time.
 * 3. Logs a count of loaded vars for transparency.
 *
 * Wire-in: src/lib/cloudflare-env.server.ts::readProcessEnv() merges
 * `globalThis.__CF_DEV_VARS__` into the process.env fallback chain, so
 * the supabase client (and any other getEnv() consumer) finds the values
 * transparently.
 *
 * Safety:
 * - In production (CF Workers), `globalThis.__CF_DEV_VARS__` is undefined
 *   and the request-context env (set by envInjectionMiddleware) takes
 *   precedence. Zero impact on production behavior.
 * - In tests, `withMockedEnv()` sets AsyncLocalStorage explicitly, so this
 *   fallback is never reached.
 * - In vite dev, the cloudflare plugin uses `getPlatformProxy()` which
 *   already injects env via a different code path; this plugin only runs
 *   in preview, so no double-loading.
 */

import type { Plugin, PreviewServer } from "vite";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Global type augmentation so other modules can read the injected vars
 * without `as any` casts.
 */
declare global {
  var __CF_DEV_VARS__: Record<string, string> | undefined;
}

const DEV_VARS_REL_PATH = "dist/server/.dev.vars";

/**
 * Parse a wrangler-style `.dev.vars` file. Format is dotenv-like but
 * uses single quotes (no escape processing, no multiline).
 * Example:
 *   SUPABASE_URL='https://abc.supabase.co'
 *   KEY_WITH_QUOTES=`value with 'apostrophe'`
 */
export function parseDevVars(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx < 0) continue;
    const key = line.slice(0, eqIdx).trim();
    let value = line.slice(eqIdx + 1).trim();
    // Strip matching surrounding quotes (single, backtick, or double).
    if (value.length >= 2) {
      const first = value[0];
      const last = value[value.length - 1];
      if (
        (first === "'" && last === "'") ||
        (first === "`" && last === "`") ||
        (first === '"' && last === '"')
      ) {
        value = value.slice(1, -1);
      }
    }
    if (/^[A-Z_][A-Z0-9_]*$/.test(key)) {
      result[key] = value;
    }
  }
  return result;
}

export function cfDevVarsInjector(): Plugin {
  return {
    name: "cf-dev-vars-injector",
    apply: "build",
    configurePreviewServer(server: PreviewServer) {
      const devVarsPath = join(server.config.root, DEV_VARS_REL_PATH);
      if (!existsSync(devVarsPath)) {
        server.config.logger.info(
          `\x1b[33m[cf-dev-vars-injector]\x1b[0m ${DEV_VARS_REL_PATH} not found. ` +
            `Run \`bun run build\` first. SSR routes needing env (e.g. /artikel) ` +
            `will return 500.`,
        );
        return;
      }
      const content = readFileSync(devVarsPath, "utf-8");
      const vars = parseDevVars(content);
      globalThis.__CF_DEV_VARS__ = vars;
      const count = Object.keys(vars).length;
      server.config.logger.info(
        `\x1b[36m[cf-dev-vars-injector]\x1b[0m Loaded ${count} vars from ` +
          `${DEV_VARS_REL_PATH} into globalThis.__CF_DEV_VARS__ for SSR runtime.`,
      );
    },
  };
}
