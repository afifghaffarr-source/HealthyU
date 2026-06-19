/**
 * Shared utility untuk mark "user has done first meaningful action".
 *
 * Dipakai oleh InstallPrompt untuk tau kapan boleh muncul — after user has
 * interacted with real content (dashboard, scan, recipe, dll).
 *
 * Idempotent: localStorage flag, aman dipanggil berkali-kali.
 * SSR-safe: no-op kalau window undefined.
 */

const FIRST_ACTION_KEY = "healthyu-first-action";

export function markFirstAction(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FIRST_ACTION_KEY, "1");
  } catch {
    // ignore (private mode / quota exceeded)
  }
}

export function hasCompletedFirstAction(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(FIRST_ACTION_KEY) === "1";
  } catch {
    return false;
  }
}
