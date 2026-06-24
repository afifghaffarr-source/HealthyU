#!/usr/bin/env bun
/**
 * HealthyU — recent production error summary.
 *
 * Reads public.error_reports through Supabase REST using service_role creds
 * stored on the server. Prints top error messages from the last 24h.
 */

import { readFileSync } from "node:fs";

async function main() {
  const configDir = "/home/ubuntu/.config/healthyu";
  const supabaseUrl = readFileSync(`${configDir}/supabase-url`, "utf8").trim();
  const serviceRole = readFileSync(`${configDir}/supabase-service-role-jwt`, "utf8").trim();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const url = new URL(`${supabaseUrl}/rest/v1/error_reports`);
  url.searchParams.set("select", "message,created_at");
  url.searchParams.set("created_at", `gte.${since}`);
  url.searchParams.set("order", "created_at.desc");
  url.searchParams.set("limit", "1000");

  const res = await fetch(url, {
    headers: {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
      "User-Agent": "healthyu-check-errors/1.0",
    },
  });

  if (!res.ok) {
    console.error(`Failed to fetch error_reports: HTTP ${res.status}`);
    console.error(await res.text());
    process.exit(1);
  }

  const rows = (await res.json()) as Array<{ message?: string | null }>;
  const counts = new Map<string, number>();
  for (const row of rows) {
    const message = row.message?.trim() || "(empty message)";
    counts.set(message, (counts.get(message) ?? 0) + 1);
  }

  console.log(`HealthyU errors in last 24h: ${rows.length}`);
  for (const [message, count] of Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)) {
    console.log(`${count.toString().padStart(4)}  ${message.slice(0, 160)}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
