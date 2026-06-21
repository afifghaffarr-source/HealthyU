/**
 * Sprint 6b: Perf budget enforcement.
 *
 * The build outputs 300+ JS chunks (mostly lazy-loaded routes). We want to
 * catch regressions where a single chunk balloons, or where initial-route
 * JS crosses a page-weight threshold.
 *
 * Budgets are read from `perf-budget.json` so the team can tune them
 * without touching code. This test runs after `bun run build` produces
 * `dist/client/assets/`.
 *
 * If dist/ is missing (e.g. `bun run test` without a prior build), every
 * test is skipped — `bun run verify` (which runs `build && test`) covers it.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const ASSETS = join(process.cwd(), "dist/client/assets");
const BUDGET_PATH = join(process.cwd(), "perf-budget.json");

interface Budget {
  /** Per-file ceiling (uncompressed bytes). 320 KB ≈ first-contentful-paint safety for a single route. */
  maxChunkBytes: number;
  /** Total initial bundle (sum of all chunks). 4 MiB ≈ reasonable for a TanStack Start app with i18n + OG + admin. */
  maxTotalBytes: number;
  /** Worker entry (server) — Cloudflare free tier is 3 MiB, paid is 10 MiB. */
  maxWorkerEntryBytes: number;
}

const DEFAULT_BUDGET: Budget = {
  maxChunkBytes: 320 * 1024, // 320 KB raw JS per chunk
  maxTotalBytes: 4 * 1024 * 1024, // 4 MiB total client JS
  maxWorkerEntryBytes: 950 * 1024, // 950 KB worker entry (under 1 MiB to keep room for handler code)
};

function loadBudget(): Budget {
  if (!existsSync(BUDGET_PATH)) return DEFAULT_BUDGET;
  try {
    return { ...DEFAULT_BUDGET, ...JSON.parse(readFileSync(BUDGET_PATH, "utf8")) };
  } catch {
    return DEFAULT_BUDGET;
  }
}

interface ChunkReport {
  name: string;
  bytes: number;
  kb: string;
}

function listJs(dir: string): ChunkReport[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".js"))
    .map((f) => {
      const s = statSync(join(dir, f));
      return { name: f, bytes: s.size, kb: (s.size / 1024).toFixed(1) };
    });
}

function findWorkerEntry(): string | null {
  const serverAssets = join(process.cwd(), "dist/server/assets");
  if (!existsSync(serverAssets)) return null;
  const f = readdirSync(serverAssets).find((x) => x.startsWith("worker-entry-"));
  return f ? join(serverAssets, f) : null;
}

const distExists = existsSync(ASSETS);
const budget = loadBudget();

// Skip the whole suite when dist/ is missing (e.g. unit test without build).
describe.skipIf(!distExists)("perf-budget", () => {
  it("keeps every client chunk under maxChunkBytes", () => {
    const chunks = listJs(ASSETS);
    const offenders = chunks.filter((c) => c.bytes > budget.maxChunkBytes);
    if (offenders.length > 0) {
      const msg = offenders.map((o) => `  ${o.name} = ${o.kb} KB`).join("\n");
      throw new Error(
        `❌ ${offenders.length} chunk(s) exceed ${budget.maxChunkBytes / 1024} KB:\n${msg}`,
      );
    }
    expect(offenders).toEqual([]);
  });

  it("keeps total client JS under maxTotalBytes", () => {
    const chunks = listJs(ASSETS);
    const total = chunks.reduce((sum, c) => sum + c.bytes, 0);
    if (total > budget.maxTotalBytes) {
      const top = chunks
        .sort((a, b) => b.bytes - a.bytes)
        .slice(0, 5)
        .map((c) => `  ${c.name} = ${c.kb} KB`)
        .join("\n");
      throw new Error(
        `❌ total client JS = ${(total / 1024 / 1024).toFixed(2)} MiB exceeds ` +
          `${(budget.maxTotalBytes / 1024 / 1024).toFixed(2)} MiB.\nTop 5:\n${top}`,
      );
    }
    expect(total).toBeLessThanOrEqual(budget.maxTotalBytes);
  });

  it("keeps worker entry under maxWorkerEntryBytes (Cloudflare free tier = 3 MiB)", () => {
    const entry = findWorkerEntry();
    if (!entry) return; // No server build available — skip.
    const size = statSync(entry).size;
    if (size > budget.maxWorkerEntryBytes) {
      throw new Error(
        `❌ worker entry = ${(size / 1024).toFixed(1)} KB exceeds ` +
          `${(budget.maxWorkerEntryBytes / 1024).toFixed(1)} KB. ` +
          `Cloudflare free tier Worker limit is 3 MiB. Consider code-splitting or removing large deps.`,
      );
    }
    expect(size).toBeLessThanOrEqual(budget.maxWorkerEntryBytes);
  });
});
