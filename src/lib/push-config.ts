// Kunci publik VAPID — aman ditampilkan di client.
// Pasangan privatnya disimpan sebagai secret server (VAPID_PRIVATE_KEY).
// Generated 2026-06-14 via `bunx web-push generate-vapid-keys`.
// IMPORTANT: Harus cocok dengan VAPID_PRIVATE_KEY di CF secrets — server
// (push.server.ts) pakai public ini untuk Authorization header VAPID, dan
// private di CF untuk sign JWT. Mismatch = push ditolak 401/403.
export const VAPID_PUBLIC_KEY =
  "BEBt6arqeb3t7oiJknt4aGwvvLlvtnr4FSidJ-D2p5ouFsf4fIwWnhXJvoLtFxSqA5jw95HFrULDvIGLncoakk8";

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
