import { Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * E2E Auth Helper
 *
 * Authenticates test user via Supabase and injects session into browser.
 * Requires E2E_TEST_EMAIL and E2E_TEST_PASSWORD env vars.
 *
 * Usage:
 *   await authenticateUser(page);
 *   await page.goto("/dashboard");
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

const TEST_EMAIL = process.env.E2E_TEST_EMAIL;
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD;

if (!TEST_EMAIL || !TEST_PASSWORD) {
  throw new Error(
    "E2E_TEST_EMAIL and E2E_TEST_PASSWORD must be set. Create a test user manually and add to .env.test",
  );
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be set");
}

export async function authenticateUser(page: Page): Promise<void> {
  // Sign in via Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data, error } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (error || !data.session) {
    throw new Error(`E2E auth failed: ${error?.message || "No session returned"}`);
  }

  // Inject session into browser localStorage
  await page.goto("/");
  await page.evaluate(
    ({ session, url }) => {
      // Supabase stores session in localStorage under key `sb-<project-ref>-auth-token`
      const projectRef = new URL(url).hostname.split(".")[0];
      const key = `sb-${projectRef}-auth-token`;
      localStorage.setItem(key, JSON.stringify(session));
    },
    { session: data.session, url: SUPABASE_URL },
  );

  // Reload to activate session
  await page.reload();
}

export async function clearAuth(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}
