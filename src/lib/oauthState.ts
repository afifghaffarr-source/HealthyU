/**
 * Pure validator for OAuth state (nonce) rows fetched from `oauth_states`.
 * Kept dependency-free so it's testable without Supabase.
 */
export type OAuthStateRow = {
  id: string;
  user_id: string;
  provider: string;
  expires_at: string;
  used_at: string | null;
};

export type OAuthStateValidation =
  | { ok: true; userId: string; stateId: string }
  | { ok: false; reason: "missing" | "wrong_provider" | "used" | "expired" };

export function validateOAuthState(
  row: OAuthStateRow | null | undefined,
  expectedProvider: string,
  now: number = Date.now(),
): OAuthStateValidation {
  if (!row) return { ok: false, reason: "missing" };
  if (row.provider !== expectedProvider) return { ok: false, reason: "wrong_provider" };
  if (row.used_at) return { ok: false, reason: "used" };
  if (new Date(row.expires_at).getTime() < now) return { ok: false, reason: "expired" };
  return { ok: true, userId: row.user_id, stateId: row.id };
}

export function oauthStateErrorMessage(
  reason: Exclude<OAuthStateValidation, { ok: true }>["reason"],
): string {
  switch (reason) {
    case "missing":
      return "State OAuth tidak valid";
    case "wrong_provider":
      return "Provider OAuth tidak cocok";
    case "used":
      return "State OAuth sudah digunakan";
    case "expired":
      return "State OAuth kadaluarsa";
  }
}
