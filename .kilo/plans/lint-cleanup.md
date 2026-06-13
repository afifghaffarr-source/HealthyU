# Lint cleanup backlog

This file documents the 42 pre-existing ESLint issues that exist as
of 2026-06-13 in the `feat/lovable-decouple` branch. The CI workflow
runs `bun run lint` with `continue-on-error: true` so this doesn't
block PRs, but the goal is to clear the backlog by v1.0.

## Current state

```
$ bunx eslint . 2>&1 | tail -1
✖ 42 problems (19 errors, 23 warnings)
```

## Issues by category

### 1. `no-empty` — 10+ errors (empty `catch {}` blocks)

Empty catches are a defensive pattern (`try { ... } catch {}` to
swallow non-critical errors). Two ways to fix:
- Add a `// ignore: non-critical` comment
- Add a `// eslint-disable-next-line no-empty` comment
- Log the error with `console.warn` (preferred for cloud observability)

Files affected: scan module + several `_authenticated/` routes.
Action: bulk eslint-disable with explanation, or add warn-level
loggers per file.

### 2. `react-refresh/only-export-components` — 20+ warnings

Fast Refresh works best when files export only components. Files
that export both components and helper functions/hooks slow down
HMR. The fix is to extract helpers to a sibling file, but this
requires a meaningful refactor.

Action: defer until feature work is stable; doesn't block.

### 3. `react-hooks/rules-of-hooks` — 1 file (1 error)

A hook is called conditionally in some component. **This is a real
bug** — could cause crashes. Should be fixed before merge to main.

Action: investigate the file, fix the conditional.

### 4. `no-control-regex` + `no-irregular-whitespace` — 1 file (1 line)

A regex contains control characters. Likely intentional for a
sanitizer, but should be reviewed.

Action: review and add `// eslint-disable-next-line` with reason.

### 5. `@typescript-eslint/no-explicit-any` — 1 file (1 error)

Explicit `any` type used. Replace with proper type.

Action: type the value.

### 6. `react-hooks/exhaustive-deps` — 1 file (1 warning)

`useMemo` dep is unstable (new ref on every render). Wrap in
`useMemo` or move to a stable ref.

Action: fix the dep.

## Plan to clear backlog

Track in a separate PR (NOT this branch) called `chore: clear
lint-cleanup backlog`. Steps:

1. `bunx eslint . --fix` (handles 71 of 90)
2. Manually fix the 19 remaining errors (above)
3. Address the 23 warnings (mostly fast-refresh — defer or extract)
4. Remove `continue-on-error: true` from CI

Estimated effort: 1-2 hours of mechanical work.

## Why deferred from this branch

The `feat/lovable-decouple` branch is focused on removing the
Lovable dependency. Mixing in a 42-issue lint cleanup would (a)
dilute the PR's purpose, (b) make code review harder, and (c) risk
merge conflicts with other work in flight.
