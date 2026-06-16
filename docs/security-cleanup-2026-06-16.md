# Security Cleanup — Revoke Old Credentials

> **Status**: Action item, ~3 minutes manual work
> **Last updated**: 2026-06-16

## Why

Two credentials that were used during initial setup (Fase 1) are still active but no longer in use:

1. **Old GitHub PAT** — used for one-off `gh` operations before `gh auth login` was set up properly. The current setup uses `gh auth login` with OAuth, not a PAT. **Risk surface: token has whatever scopes were originally granted, can be misused if leaked.**
2. **Old CF API token** (`cfut_Y4dFDSB...`) — was rotated to a new token (`cfut_NhdmKTr...`) on 2026-06-15. The old one is now defunct but still listed in CF dashboard. **Risk surface: account-level token (likely Workers Scripts:Edit), if leaked could deploy to your account.**

Both should be revoked to follow least-privilege.

## Action 1: Revoke Old GitHub PAT (~1 min)

1. Open https://github.com/settings/tokens
   - Or: GitHub avatar (top right) → **Settings** → **Developer settings** (left sidebar) → **Personal access tokens** → **Tokens (classic)**
2. Look for the old PAT in the list
   - It will be a classic token (starts with `ghp_`)
   - Most likely labeled with the date you created it (before ~2026-06-15) or with a broad scope like `repo`, `workflow`, `admin:org`
3. Click **Delete** → confirm
4. Verify: list should not show the old token anymore

**Can't find the old PAT?** That's fine — if you don't see a long-lived classic PAT from before 2026-06-15, then you've already cleaned up at some point. Just verify the list looks like:

- ✅ Fine-grained tokens with specific repo scope (e.g., "HealthyU CI" with only `contents: write`)
- ❌ No classic PATs with broad scope
- ❌ No PATs you don't recognize

## Action 2: Revoke Old Cloudflare API Token (~1 min)

1. Open https://dash.cloudflare.com/profile/api-tokens
2. Find the old token:
   - Name is something you set initially (e.g., "HealthyU Deploy", "CI token v1", or no name)
   - The token **value** starts with `cfut_Y4dFDSB...` (you won't see the full value, but the first 10 chars are shown when you click "View")
3. Confirm it's the OLD one (not the current one used in GH secrets):
   - The current token (in GH repo secret `CLOUDFLARE_API_TOKEN`, set 2026-06-15) starts with `cfut_NhdmKTr...`
   - The old one starts with `cfut_Y4dFDSB...`
4. Click the **3-dot menu** (or **Roll** button) → **Delete** / **Revoke** → confirm
5. Verify: token should disappear from the list within ~5 seconds

**Defense in depth — re-roll the CURRENT token too** (optional, ~1 extra min):

If you want to be extra safe, you can also re-roll the current `cfut_NhdmKTr...` token:

1. Click the 3-dot menu next to the current token → **Roll**
2. CF will generate a new value (visible once, copy it!)
3. Update GH repo secret: `gh secret set CLOUDFLARE_API_TOKEN` and paste new value
4. Verify next CI deploy still works (push a test commit or run `workflow_dispatch`)

**Recommendation**: skip this unless you suspect the current token has been exposed. Rolling has a small risk of breaking the next deploy if you forget to update the GH secret.

## Action 3: Verify Cleanup (~30 sec)

After both are revoked:

1. **GitHub**: try `gh auth status` from your terminal — should still show "Logged in" because we use OAuth, not the old PAT
2. **Cloudflare**: try `gh run list --workflow=deploy --limit 1` and check the latest deploy still has the env vars it needs
3. **Next push to main**: CI deploy should still work (uses the new CF token from GH secret, not the old one)

## Rollback (if something breaks)

If revoking the current CF token accidentally broke something:

- Re-create a new token at https://dash.cloudflare.com/profile/api-tokens with the same template (Workers Scripts: Edit, account resources: include your `healthyu` worker)
- Update GH repo secret: `gh secret set CLOUDFLARE_API_TOKEN`
- Push a test commit to trigger deploy

## Postmortem Note (optional)

If you want to record this cleanup in the audit docs, the relevant sections are:

- `audit/01-findings.md` line 30 (Fase 5 area)
- Could add a "Security hygiene" section if you want it permanent

---

**Estimated time**: 3 min
**Risk if skipped**: low-medium (both tokens are not actively used, but having unused credentials lying around violates least-privilege and is a security audit finding)
