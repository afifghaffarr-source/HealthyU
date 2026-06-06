import { describe, it, expect } from "vitest";
import {
  USER_DATA_TABLES,
  EXCLUDED_USER_DATA_TABLES,
  FORBIDDEN_LEGACY_TABLE_NAMES,
} from "../userDataTables";

describe("USER_DATA_TABLES", () => {
  it("uses `id` ownerColumn for profiles (not user_id)", () => {
    const profiles = USER_DATA_TABLES.find((t) => t.table === "profiles");
    expect(profiles).toBeDefined();
    expect(profiles!.ownerColumn).toBe("id");
  });

  it("uses `user_id` ownerColumn for every non-profiles table", () => {
    for (const t of USER_DATA_TABLES) {
      if (t.table === "profiles") continue;
      expect(t.ownerColumn, `${t.table} ownerColumn`).toBe("user_id");
    }
  });

  it("does not reference forbidden legacy table names", () => {
    const names = new Set(USER_DATA_TABLES.map((t) => t.table));
    for (const legacy of FORBIDDEN_LEGACY_TABLE_NAMES) {
      expect(names.has(legacy), `legacy table ${legacy} must not appear`).toBe(false);
    }
  });

  it("has no duplicate table entries", () => {
    const names = USER_DATA_TABLES.map((t) => t.table);
    expect(new Set(names).size).toBe(names.length);
  });

  it("USER_DATA_TABLES and EXCLUDED_USER_DATA_TABLES are disjoint", () => {
    const included = new Set(USER_DATA_TABLES.map((t) => t.table));
    for (const e of EXCLUDED_USER_DATA_TABLES) {
      expect(included.has(e.table), `${e.table} appears in both lists`).toBe(false);
      expect(e.reason.length, `${e.table} needs a reason`).toBeGreaterThan(10);
    }
  });
});
