import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getEnv } from "@/lib/cloudflare-env.server";

type QueryableClient = {
  from: (table: string) => {
    select: (...args: unknown[]) => {
      eq: (...args: unknown[]) => {
        maybeSingle: () => Promise<{
          data: {
            access_token?: string;
            refresh_token?: string;
            expires_at?: string;
          } | null;
          error: { message: string } | null;
        }>;
      };
    };
    update: (...args: unknown[]) => {
      eq: (...args: unknown[]) => Promise<unknown>;
    };
    insert: (...args: unknown[]) => Promise<unknown>;
    upsert: (...args: unknown[]) => Promise<unknown>;
    delete: (...args: unknown[]) => {
      eq: (...args: unknown[]) => Promise<unknown>;
    };
    maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>;
  };
};

type GoogleAggregateResponse = {
  bucket: Array<{
    startTimeMillis: string;
    dataset: Array<{
      point: Array<{
        value: Array<{
          intVal?: number;
          fpVal?: number;
        }>;
      }>;
    }>;
  }>;
};

const SCOPES = [
  "https://www.googleapis.com/auth/fitness.activity.read",
  "https://www.googleapis.com/auth/fitness.heart_rate.read",
  "https://www.googleapis.com/auth/fitness.sleep.read",
].join(" ");

function redirectUri(origin: string) {
  return `${origin}/api/wearable/google-fit/callback`;
}

export const startGoogleFit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ origin: z.string().url() }).parse(i))
  .handler(async ({ data, context }) => {
    const clientId = getEnv().GOOGLE_FIT_CLIENT_ID;
    if (!clientId) throw new Error("GOOGLE_FIT_CLIENT_ID belum di-set");
    // Generate signed nonce, persist via service role
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { randomBytes } = await import("crypto");
    const nonce = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { error: insErr } = await supabaseAdmin.from("oauth_states").insert({
      user_id: context.userId,
      provider: "google_fit",
      nonce,
      expires_at: expiresAt,
    });
    if (insErr) throw new Error("Gagal generate OAuth state");
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri(data.origin));
    url.searchParams.set("response_type", "code");
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("scope", SCOPES);
    url.searchParams.set("state", nonce);
    return { url: url.toString() };
  });

export const getWearableStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("wearable_tokens")
      .select("provider, last_sync_at, scope")
      .eq("user_id", userId)
      .maybeSingle();
    const { data: steps } = await supabase
      .from("daily_steps")
      .select("day, steps")
      .eq("user_id", userId)
      .order("day", { ascending: false })
      .limit(7);
    return { connected: !!data, ...(data ?? {}), recent_steps: steps ?? [] };
  });

export const disconnectGoogleFit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await supabase.from("wearable_tokens").delete().eq("user_id", userId);
    return { ok: true };
  });

async function refreshIfNeeded(supabase: QueryableClient, userId: string): Promise<string> {
  const { data: row, error } = await supabase
    .from("wearable_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !row) throw new Error("Belum terhubung ke Google Fit");
  const expires = new Date(row.expires_at as string).getTime();
  if (expires - Date.now() > 60_000) return row.access_token as string;

  const env = getEnv();
  const clientId = env.GOOGLE_FIT_CLIENT_ID!;
  const clientSecret = env.GOOGLE_FIT_CLIENT_SECRET!;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: String(row.refresh_token),
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error("Gagal refresh token Google Fit");
  const json = (await res.json()) as { access_token: string; expires_in: number };
  const newExpires = new Date(Date.now() + json.expires_in * 1000).toISOString();
  await supabase
    .from("wearable_tokens")
    .update({
      access_token: json.access_token,
      expires_at: newExpires,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
  return json.access_token;
}

async function aggregate(token: string, dataTypeName: string, days: number) {
  const endMs = Date.now();
  const startMs = endMs - days * 24 * 3600 * 1000;
  const res = await fetch("https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      aggregateBy: [{ dataTypeName }],
      bucketByTime: { durationMillis: 86_400_000 },
      startTimeMillis: startMs,
      endTimeMillis: endMs,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Google Fit ${dataTypeName} ${res.status}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as GoogleAggregateResponse;
}

export const syncGoogleFit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as unknown as {
      supabase: QueryableClient;
      userId: string;
    };
    const token = await refreshIfNeeded(supabase, userId);

    let stepsCount = 0;
    let hrCount = 0;
    const syncErrors: string[] = [];

    // Steps - 7 days
    try {
      const stepsRes = await aggregate(token, "com.google.step_count.delta", 7);
      const rows = stepsRes.bucket
        .map((b) => {
          const day = new Date(Number(b.startTimeMillis)).toISOString().slice(0, 10);
          const steps = b.dataset[0]?.point.reduce((s, p) => s + (p.value[0]?.intVal ?? 0), 0) ?? 0;
          return { user_id: userId, day, steps, source: "google_fit" };
        })
        .filter((r) => r.steps > 0);
      if (rows.length) {
        await supabase.from("daily_steps").upsert(rows, { onConflict: "user_id,day" });
        stepsCount = rows.length;
      }
    } catch (error) {
      syncErrors.push(error instanceof Error ? error.message : "Gagal sinkron langkah");
    }

    // Heart rate average - last 7 days
    try {
      const hrRes = await aggregate(token, "com.google.heart_rate.bpm", 7);
      for (const b of hrRes.bucket) {
        const points = b.dataset[0]?.point ?? [];
        if (!points.length) continue;
        const avg = points.reduce((s, p) => s + (p.value[0]?.fpVal ?? 0), 0) / points.length;
        if (avg > 0) {
          await supabase.from("vitals_logs").insert({
            user_id: userId,
            heart_rate: Math.round(avg),
            note: "Auto-sync Google Fit",
            logged_at: new Date(Number(b.startTimeMillis)).toISOString(),
          });
          hrCount++;
        }
      }
    } catch (error) {
      syncErrors.push(error instanceof Error ? error.message : "Gagal sinkron detak jantung");
    }

    if (syncErrors.length > 0 && stepsCount === 0 && hrCount === 0) {
      throw new Error(syncErrors[0]);
    }

    await supabase
      .from("wearable_tokens")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("user_id", userId);

    return { ok: true, steps_days: stepsCount, heart_rate_days: hrCount };
  });
