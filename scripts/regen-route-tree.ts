#!/usr/bin/env bun
/**
 * Regenerate src/routeTree.gen.ts after adding new route files.
 * Equivalent to what `vite build` does internally via the tanstack plugin.
 *
 * Usage: bun scripts/regen-route-tree.ts
 */
import { Generator, getConfig } from "@tanstack/router-generator";
import { resolve } from "node:path";

const projectRoot = resolve(__dirname, "..");

const config = await getConfig({}, projectRoot);

const generator = new Generator({
  root: projectRoot,
  config,
});

await generator.run();
console.log("✅ routeTree.gen.ts regenerated");
