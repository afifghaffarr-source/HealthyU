# Code Coverage Baseline — 2026-06-16

> **Baseline numbers captured from CI run `27599709686` (commit `cd871c75`).**
> **All 4 thresholds passing.** This is the reference for future coverage work.

## Current Coverage (as of 2026-06-16)

| Metric     | Current               | Threshold | Status |
| ---------- | --------------------- | --------- | ------ |
| Lines      | **76.07%** (693/911)  | 70%       | ✅     |
| Statements | **73.63%** (782/1062) | 70%       | ✅     |
| Functions  | **72.91%** (175/240)  | 70%       | ✅     |
| Branches   | **69.94%** (412/589)  | 60%       | ✅     |

**Per-folder breakdown** (CI artifact, `index.html`):

| Folder                          | Lines  | Functions | Statements | Branches | Notes                                              |
| ------------------------------- | ------ | --------- | ---------- | -------- | -------------------------------------------------- |
| `components/live-announcer.tsx` | 88.23% | 100%      | 100%       | 57.14%   | Low branches (single component, many return paths) |
| `hooks/` (8 files)              | 63.84% | 65.57%    | 59.57%     | 66.01%   | **Below 70% line** — main improvement target       |
| `lib/` (33 files)               | 75.34% | 75.53%    | 77.68%     | 70.63%   | Healthy                                            |

## Threshold Configuration

`vitest.config.ts`:

```ts
coverage: {
  provider: "v8",
  include: ["src/hooks/**", "src/lib/**", "src/components/live-announcer.tsx"],
  exclude: [
    "src/lib/**/*.functions.ts",     // server functions — integration test territory
    "src/lib/**/*.functions.tsx",
    "src/lib/**/*.server.ts",        // server-only modules
    "src/lib/**/*.server.tsx",
  ],
  thresholds: { lines: 70, functions: 70, statements: 70, branches: 60 },
}
```

Thresholds are **global** (aggregate across included files). Per-folder exemptions needed for tight coupling.

## Bun 1.3.x Coverage Bug (LOCAL ONLY)

**Bug**: `bunx vitest run --coverage` on **local bun 1.3.x** returns "Coverage APIs are not supported" → reports 0% for ALL files. Silent failure.

**Why CI is OK**: CI uses `oven-sh/setup-bun@v2` with `bun-version: 1.2.21` (pinned as of 2026-06-16) which has working v8 inspector. **The CI pin was added in commit `e1d7f9b3` (next)** to prevent future drift.

**Local workarounds**:

- Pin local bun to 1.2.21: `curl -fsSL https://bun.sh/install | bash -s "bun-v1.2.21"`
- Or run `bunx vitest run` (no `--coverage` flag) — tests pass, just no coverage report
- Or rely on CI's coverage artifact (download from Actions → coverage-html)

**Tracking**: https://github.com/oven-sh/bun/issues/2445

## Hooks Folder Improvement Target (Optional)

`hooks/` folder is 63.84% lines — below 70% line threshold. Global average compensates, but a future PR adding many uncovered hook files could push the global below threshold. Candidate files to add tests for (in priority order):

| File                     | Lines    | Notes                                                   |
| ------------------------ | -------- | ------------------------------------------------------- |
| `use-offline-queue.ts`   | 47 lines | Offline sync queue — high business value, complex logic |
| `use-pull-to-refresh.ts` | 28 lines | PWA gesture, regression risk                            |
| `use-recent-search.ts`   | 21 lines | Storage persistence, easy to test                       |
| `useMiniFocusTrap.ts`    | 19 lines | A11y — should be tested                                 |
| `use-onboarding-flag.ts` | 13 lines | Simple localStorage wrapper                             |
| `useReducedMotion.ts`    | 11 lines | Media query observer                                    |

Effort: S (1-2 hours for all 6). Can be a follow-up PR.

## How to Re-verify

```bash
# Local: download CI artifact (no local coverage available)
gh run download <run-id> --name coverage-html --dir /tmp/coverage
# Open /tmp/coverage/index.html

# CI: every push to main uploads coverage-html artifact
# (Actions → run → bottom Artifacts section)
```

## Future Work (Out of Scope for Now)

- **Per-folder thresholds**: tighten `hooks/` to 70% line, `lib/` to 80% (current global 70% is loose)
- **Server function coverage**: switch from `src/lib/__tests__/*` mocks to `src/routes/api/__tests__/*` integration tests (already partially done with `chat.stream.test.ts`)
- **Component coverage**: expand `include` to `src/components/dashboard/**` (currently only `live-announcer.tsx`)
- **Mutation testing**: use `stryker` to verify tests actually catch bugs (not just exercise code paths)
