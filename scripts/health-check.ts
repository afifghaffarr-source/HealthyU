#!/usr/bin/env bun
/**
 * HealthyU — Health Check Script
 *
 * Checks production endpoints and reports status.
 * Run manually or via cron for uptime monitoring.
 *
 * Usage:
 *   bun run scripts/health-check.ts
 *   bun run scripts/health-check.ts --verbose
 */

const ENDPOINTS = [
  { name: "Landing page", url: "https://healthyu.web.id/", method: "GET", expected: 200 },
  { name: "Health API", url: "https://healthyu.web.id/api/health", method: "GET", expected: 200 },
  {
    name: "Supabase REST",
    url: "https://ohkfcldkuzfcxnpqvdvc.supabase.co/rest/v1/",
    method: "GET",
    expected: 401,
  }, // 401 = auth required (healthy)
];

const VERBOSE = process.argv.includes("--verbose");
const TIMEOUT_MS = 10000;

interface CheckResult {
  name: string;
  url: string;
  status: number | "TIMEOUT" | "ERROR";
  ok: boolean;
  latencyMs: number;
  error?: string;
}

async function checkEndpoint(endpoint: (typeof ENDPOINTS)[0]): Promise<CheckResult> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(endpoint.url, {
      method: endpoint.method,
      signal: controller.signal,
      headers: {
        "User-Agent": "HealthyU-HealthCheck/1.0",
      },
    });

    clearTimeout(timeoutId);
    const latencyMs = Date.now() - start;

    return {
      name: endpoint.name,
      url: endpoint.url,
      status: response.status,
      ok: response.status === endpoint.expected,
      latencyMs,
    };
  } catch (error: unknown) {
    const latencyMs = Date.now() - start;
    const isTimeout = error instanceof Error && error.name === "AbortError";
    const message = error instanceof Error ? error.message : String(error);
    return {
      name: endpoint.name,
      url: endpoint.url,
      status: isTimeout ? "TIMEOUT" : "ERROR",
      ok: false,
      latencyMs,
      error: message,
    };
  }
}

async function main() {
  console.log("🏥 HealthyU Health Check");
  console.log(`   ${new Date().toISOString()}`);
  console.log("");

  const results = await Promise.all(ENDPOINTS.map(checkEndpoint));

  let allOk = true;
  for (const result of results) {
    const icon = result.ok ? "✅" : "❌";
    const status = typeof result.status === "number" ? `HTTP ${result.status}` : result.status;
    const latency = `${result.latencyMs}ms`;

    console.log(`${icon} ${result.name}`);
    console.log(`   ${result.url}`);
    console.log(`   ${status} | ${latency}`);

    if (!result.ok) {
      allOk = false;
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }

    if (VERBOSE && result.ok) {
      console.log(`   Expected: HTTP ${ENDPOINTS.find((e) => e.url === result.url)?.expected}`);
    }

    console.log("");
  }

  // Summary
  const okCount = results.filter((r) => r.ok).length;
  const totalCount = results.length;
  const avgLatency = Math.round(results.reduce((sum, r) => sum + r.latencyMs, 0) / totalCount);

  console.log("─".repeat(60));
  console.log(`📊 Summary: ${okCount}/${totalCount} endpoints OK`);
  console.log(`   Avg latency: ${avgLatency}ms`);

  if (allOk) {
    console.log("   Status: ✅ HEALTHY");
    process.exit(0);
  } else {
    console.log("   Status: ❌ UNHEALTHY");
    console.log("");
    console.log("⚠️  Action required:");
    console.log("   1. Check Cloudflare Workers dashboard for errors");
    console.log("   2. Run: wrangler tail (real-time logs)");
    console.log("   3. Check Supabase status: https://status.supabase.com");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(2);
});
