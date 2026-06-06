/**
 * SSR-safe browser helpers. TanStack Start can render on server,
 * so guard all window/document/localStorage access via these helpers.
 */
export const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";

export function getSafeLocalStorage(): Storage | null {
  if (!isBrowser) return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getSafeSessionStorage(): Storage | null {
  if (!isBrowser) return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function safeMatchMedia(query: string): MediaQueryList | null {
  if (!isBrowser || typeof window.matchMedia !== "function") return null;
  try {
    return window.matchMedia(query);
  } catch {
    return null;
  }
}

export function readLocalStorage(key: string): string | null {
  const s = getSafeLocalStorage();
  if (!s) return null;
  try {
    return s.getItem(key);
  } catch {
    return null;
  }
}

export function writeLocalStorage(key: string, value: string): boolean {
  const s = getSafeLocalStorage();
  if (!s) return false;
  try {
    s.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeLocalStorage(key: string): boolean {
  const s = getSafeLocalStorage();
  if (!s) return false;
  try {
    s.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
