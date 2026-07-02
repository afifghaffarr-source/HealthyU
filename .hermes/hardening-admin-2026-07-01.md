# Admin Panel Hardening Verification — 2026-07-01

**Context:** S58 shipped 6 admin pages via delegate_task. TSC+lint clean but NEVER browser-verified prod. This hardening sweep = actual click-through.

## Verification Summary

| Page                   | Status  | Findings                                           |
| ---------------------- | ------- | -------------------------------------------------- |
| `/admin/config`        | ✓ Loads | 🐛 Edit drawer no-op (click doesn't open)          |
| `/admin/i18n`          | ✓ Loads | 🐛 Edit drawer no-op (click doesn't open)          |
| `/admin/notifications` | ✓ Loads | ✓ Drawer works (opened, fields populated)          |
| `/admin/promo`         | ✓ Loads | ✓ Drawer works (full CRUD form visible)            |
| `/admin/banners`       | ✓ Loads | ✓ Drawer works (datetime pickers + color swatches) |
| `/admin/experiments`   | ✓ Loads | ✓ Drawer works (A/B stats + JSON editors)          |

## Bugs Found

### Bug 1: App Config drawer no-op

**Page:** `/admin/config`  
**Symptom:** Click any config item card → no drawer opens  
**Expected:** Drawer with edit form (like promo/banners/experiments)  
**Impact:** Config editing via admin UI completely broken

### Bug 2: Translation Editor — NOT A BUG (two-column by design)

**Page:** `/admin/i18n`  
**Symptom:** Click translation key → appears to do nothing  
**Actual:** Updates `selected` state, shows EditPanel in right column (line 170-183)  
**Design:** Two-column layout (list left, edit panel right), NOT drawer overlay  
**Impact:** None — working as designed

## What Worked

- ✓ All 6 pages load without crash
- ✓ Sidebar navigation works
- ✓ List views render data correctly
- ✓ 4/6 drawers open and populate fields
- ✓ Test admin user login (`hermes-hardening-test@healthyu-test.local`)

## Next Steps

1. Fix drawer state bugs (likely TanStack Router or Radix Dialog `open` prop issue)
2. Test CRUD operations (save/delete/duplicate) on working drawers
3. Verify RLS permissions (admin role bypass)

## Test User

- Email: `hermes-hardening-test@healthyu-test.local`
- Password: `TestHardening2026!`
- Role: `admin`
- Onboarded: `true`
- Created: 2026-06-30 (reused from previous hardening)
