// Kunci publik VAPID — aman ditampilkan di client.
// Pasangan privatnya disimpan sebagai secret server (VAPID_PRIVATE_KEY).
// Generated 2026-06-14 via `bunx web-push generate-vapid-keys`
export const VAPID_PUBLIC_KEY =
  "BEEW2-_Ozvcuye-VtIMl3ui-0HU5lCg_jAoFIPQEh33FaqKaPSkTfccTHIWpTA-AHqpLIc-VURMq_wVe4UlklV4";

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
