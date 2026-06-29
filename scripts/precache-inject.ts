#!/usr/bin/env bun
/**
 * Post-build: inject precache manifest into sw.js.
 *
 * Sprint 45 — workbox-build.injectManifest() is broken under Bun 1.2.21
 * (ESM/CJS interop bug with brace-expansion@2.x), so __WB_MANIFEST stays empty.
 *
 * This script manually walks dist/client and populates __WB_MANIFEST
 * with built assets so the SW precaches the app shell for offline use.
 */
import { readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const DIST = join(process.cwd(), "dist", "client");
const SW_PATH = join(DIST, "sw.js");

if (!statSync(SW_PATH, { throwIfNoEntry: false })) {
  console.log("[precache-inject] sw.js not found, skipping");
  process.exit(0);
}

function walk(dir: string): string[] {
  const entries: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory() && name !== "assets") continue; // skip non-asset dirs
    if (st.isDirectory()) {
      entries.push(...walk(full));
    } else {
      entries.push(full);
    }
  }
  return entries;
}

const files = walk(join(DIST, "assets"));

const manifest = files
  .filter((f) => {
    const ext = f.split(".").pop();
    return ["html", "js", "css", "woff2", "png", "svg", "ico", "json"].includes(ext ?? "");
  })
  .map((f) => {
    const url = "/" + relative(DIST, f);
    // Hash-based filenames are immutable → revision: null
    const hasHash = /\.[a-f0-9]{8,}\./.test(url);
    const buf = readFileSync(f);
    // Simple hash for non-hashed files
    let revision: string | null = null;
    if (!hasHash) {
      let hash = 0;
      for (let i = 0; i < buf.length; i++) hash = ((hash << 5) - hash + buf[i]) | 0;
      revision = Math.abs(hash).toString(16);
    }
    return { url, revision };
  });

const manifestJson = JSON.stringify(manifest);
const swContent = readFileSync(SW_PATH, "utf-8");

// Replace empty manifest with real one — handles both dev and minified SW
let updated = swContent.replace(
  /self\.__WB_MANIFEST\s*\|\|\s*\[\s*\]\s*\)/,
  `self.__WB_MANIFEST = ${manifestJson})`,
);
if (updated === swContent) {
  // Minified variant: no spaces
  updated = swContent.replace(
    /self\.__WB_MANIFEST\|\|\[\]\)/,
    `self.__WB_MANIFEST = ${manifestJson})`,
  );
}

if (updated === swContent) {
  console.log("[precache-inject] WARNING: could not find injection point in sw.js");
  process.exit(1);
}

writeFileSync(SW_PATH, updated);
console.log(`[precache-inject] injected ${manifest.length} assets into sw.js precache manifest`);
