import { supabase } from "@/integrations/supabase/client";

/**
 * 2FA TOTP helpers (Supabase native MFA).
 * Browser-only: uses the auth client with localStorage session.
 *
 * Flow:
 *   1. enrollTotp()    -> returns { factorId, qrSvg, secret }
 *   2. (user scans QR & enters code)
 *   3. verifyTotpEnroll(factorId, code) -> activates the factor
 *
 * Sign-in challenge:
 *   1. challengeTotp(factorId)
 *   2. verifyTotpChallenge(factorId, challengeId, code)
 */

export async function listFactors() {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  return data;
}

export async function enrollTotp(friendlyName = "HealthyU Authenticator") {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName,
  });
  if (error) throw error;
  return {
    factorId: data.id,
    qrSvg: data.totp.qr_code, // SVG string for <img src={...}>
    secret: data.totp.secret, // for manual entry
    uri: data.totp.uri,
  };
}

export async function verifyTotpEnroll(factorId: string, code: string) {
  const { data: ch, error: cerr } = await supabase.auth.mfa.challenge({ factorId });
  if (cerr) throw cerr;
  const { data, error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: ch.id,
    code,
  });
  if (error) throw error;
  return data;
}

export async function unenrollFactor(factorId: string) {
  const { data, error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw error;
  return data;
}

export async function challengeTotp(factorId: string) {
  const { data, error } = await supabase.auth.mfa.challenge({ factorId });
  if (error) throw error;
  return data.id;
}

export async function verifyTotpChallenge(factorId: string, challengeId: string, code: string) {
  const { data, error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId,
    code,
  });
  if (error) throw error;
  return data;
}

/** Returns the current AAL (Authenticator Assurance Level). */
export async function getAuthenticatorLevel() {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) throw error;
  return data; // { currentLevel: 'aal1'|'aal2', nextLevel: 'aal1'|'aal2' }
}
