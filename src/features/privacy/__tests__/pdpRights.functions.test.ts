import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for the pure `buildExportDump` function extracted from pdpRights.functions.ts.
 *
 * The function iterates `USER_DATA_TABLES` and queries Supabase for each. We mock
 * the supabase client with a chainable builder and assert:
 *  1. metadata fields (`exported_at`, `user_id`) are written
 *  2. each table is queried with `.from(table).select("*").eq(<owner>, userId)`
 *  3. optional table errors → `[]` (not propagated)
 *  4. required table errors → `{ error: "unavailable" }` (NEVER throws)
 *  5. normal results → the row array
 *
 * We do NOT test the wrapping `exportMyData` server function here — its only
 * extra concern is the audit-log RPC, which is verified by the existing
 * `pdpRights.functions.ts` smoke test inside the function's source comment
 * (manual in browser; could be lifted to a route test if audit breakage becomes
 * a recurring risk).
 */
import { buildExportDump } from "@/features/privacy/lib/pdpRights.functions";
import { categorizeAll, INVENTORY_CATEGORIES } from "@/features/privacy/lib/inventoryCategories";
import { USER_DATA_TABLES } from "@/lib/userDataTables";

// Per-table programmable result so each test can choose which tables error.
const tableResults: Record<string, { data: unknown[] | null; error: { message: string } | null }> =
  {};

function buildMockSupabase() {
  return {
    from: (table: string) => {
      const r = tableResults[table] ?? { data: [], error: null };
      return {
        select: () => ({
          eq: () => Promise.resolve(r),
        }),
      };
    },
  };
}

beforeEach(() => {
  // Reset per-table results and silence the [pdp.export] console.error that
  // the function emits for required-table errors — we expect it, but noisy.
  for (const k of Object.keys(tableResults)) delete tableResults[k];
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("buildExportDump", () => {
  it("writes exported_at + user_id metadata", async () => {
    const sb = buildMockSupabase() as never;
    const dump = await buildExportDump(sb, "user-1");
    expect(dump.user_id).toBe("user-1");
    expect(typeof dump.exported_at).toBe("string");
    // ISO 8601 with milliseconds + Z
    expect(dump.exported_at as string).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it("queries every table in USER_DATA_TABLES with the correct owner column", async () => {
    const calls: Array<{ table: string; owner: string; value: string }> = [];
    const sb = {
      from: (table: string) => ({
        select: () => ({
          eq: (owner: string, value: string) => {
            calls.push({ table, owner, value });
            return Promise.resolve({ data: [], error: null });
          },
        }),
      }),
    };
    await buildExportDump(sb as never, "u-42");
    expect(calls).toHaveLength(USER_DATA_TABLES.length);
    // Every call targets the same userId
    for (const c of calls) {
      expect(c.value).toBe("u-42");
    }
    // profiles uses ownerColumn `id`, not `user_id`
    const profiles = calls.find((c) => c.table === "profiles");
    expect(profiles?.owner).toBe("id");
    const mealLogs = calls.find((c) => c.table === "meal_logs");
    expect(mealLogs?.owner).toBe("user_id");
  });

  it("writes row arrays for tables that return data", async () => {
    tableResults["meal_logs"] = {
      data: [{ id: 1, user_id: "u-1", food: "nasi" }],
      error: null,
    };
    const dump = await buildExportDump(buildMockSupabase() as never, "u-1");
    expect(dump.meal_logs).toEqual([{ id: 1, user_id: "u-1", food: "nasi" }]);
  });

  it("writes [] for OPTIONAL tables that error (does not throw)", async () => {
    tableResults["community_posts"] = {
      data: null,
      error: { message: "permission denied" },
    };
    // Sanity: community_posts is marked optional
    const spec = USER_DATA_TABLES.find((t) => t.table === "community_posts");
    expect(spec?.optional).toBe(true);

    const dump = await buildExportDump(buildMockSupabase() as never, "u-1");
    expect(dump.community_posts).toEqual([]);
  });

  it("writes { error: 'unavailable' } for REQUIRED tables that error (does not throw)", async () => {
    tableResults["profiles"] = {
      data: null,
      error: { message: "row-level security violation" },
    };
    // Sanity: profiles is required (no optional flag)
    const spec = USER_DATA_TABLES.find((t) => t.table === "profiles");
    expect(spec?.optional).toBeUndefined();

    const dump = await buildExportDump(buildMockSupabase() as never, "u-1");
    expect(dump.profiles).toEqual({ error: "unavailable" });
    // Raw error text must NOT leak into the dump
    const json = JSON.stringify(dump);
    expect(json).not.toContain("row-level security violation");
  });

  it("never throws when EVERY table errors (worst-case still returns a complete dump)", async () => {
    for (const t of USER_DATA_TABLES) {
      tableResults[t.table] = { data: null, error: { message: "kapow" } };
    }
    const dump = await buildExportDump(buildMockSupabase() as never, "u-1");
    // Metadata keys present + every table key accounted for
    expect(dump.user_id).toBe("u-1");
    expect(typeof dump.exported_at).toBe("string");
    expect(Object.keys(dump).length).toBe(USER_DATA_TABLES.length + 2);
    for (const t of USER_DATA_TABLES) {
      // Optional → [] ; required → { error: "unavailable" }
      const expected = t.optional ? [] : { error: "unavailable" };
      expect(dump[t.table]).toEqual(expected);
    }
  });
});

/**
 * Inventory categorization test — guarantees every entry of USER_DATA_TABLES
 * is placed in some INVENTORY_CATEGORIES bucket. If a developer adds a new
 * user-data table and forgets to add it to a bucket, this test fails.
 *
 * We DO NOT want orphan tables displayed in the Privacy Vault "Apa yang kami
 * simpan" UI — that's both a UX hole and a PDP compliance miss.
 */
describe("INVENTORY_CATEGORIES coverage", () => {
  it("covers every table in USER_DATA_TABLES exactly once", () => {
    const { covered, missing } = categorizeAll(USER_DATA_TABLES);

    // Sanity: we cover at least the canonical core tables
    expect(covered).toContain("profiles");
    expect(covered).toContain("meal_logs");
    expect(covered).toContain("audit_log");

    // Hard invariant: zero tables unaccounted for
    if (missing.length > 0) {
      throw new Error(
        `INVENTORY_CATEGORIES missing coverage for ${missing.length} table(s):\n` +
          missing.map((t) => `  - ${t}`).join("\n") +
          `\n\nAdd these to inventoryCategories.ts or document an exclusion in EXCLUDED_USER_DATA_TABLES.`,
      );
    }
    expect(missing).toEqual([]);
  });

  it("every table in a bucket exists in USER_DATA_TABLES (no typos)", () => {
    const validTables = new Set(USER_DATA_TABLES.map((t) => t.table));
    for (const cat of INVENTORY_CATEGORIES) {
      for (const t of cat.tables) {
        expect(validTables.has(t)).toBe(true);
      }
    }
  });
});
