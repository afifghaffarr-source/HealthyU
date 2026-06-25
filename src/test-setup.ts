// Vitest setup: injects stub VITE_* env vars for any module that validates
// at import time (e.g. src/lib/env.ts). Without this, modules with
// `import.meta.env.VITE_*` access throw on import under jsdom.

const STUBS: Record<string, string> = {
  VITE_SUPABASE_URL: "https://test.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY: "eyJhbG...test",
  VITE_SUPABASE_PROJECT_ID: "test",
};

for (const [k, v] of Object.entries(STUBS)) {
  // import.meta.env is a Vite proxy; plain assignment works.
  if (import.meta.env[k] === undefined) {
    (import.meta.env as Record<string, string>)[k] = v;
  }
}

// Ensure navigator.onLine is available in jsdom environment
if (typeof window !== "undefined" && typeof navigator !== "undefined") {
  if (!("onLine" in navigator)) {
    Object.defineProperty(navigator, "onLine", {
      writable: true,
      configurable: true,
      value: true,
    });
  }
}
