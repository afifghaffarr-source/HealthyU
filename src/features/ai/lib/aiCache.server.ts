import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Tier } from "./aiRouter.server";

// 24h for factual (tier 2 short), 1h for personalized (tier 3 or long).
function ttlMs(tier: Tier, isPersonal: boolean): number {
  if (tier >= 3 || isPersonal) return 60 * 60 * 1000;
  return 24 * 60 * 60 * 1000;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function cacheKey(args: {
  model: string;
  tier: Tier;
  question: string;
  profileHash: string;
}): Promise<string> {
  return sha256Hex(`${args.model}|t${args.tier}|${args.profileHash}|${normalize(args.question)}`);
}

export async function getCached(key: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("ai_response_cache")
    .select("response, expires_at")
    .eq("key", key)
    .maybeSingle();
  if (!data) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  return data.response;
}

export async function setCached(args: {
  key: string;
  response: string;
  model: string;
  tier: Tier;
  isPersonal: boolean;
}): Promise<void> {
  const expires_at = new Date(Date.now() + ttlMs(args.tier, args.isPersonal)).toISOString();
  await supabaseAdmin.from("ai_response_cache").upsert({
    key: args.key,
    response: args.response,
    model: args.model,
    tier: args.tier,
    expires_at,
  });
}

// ──────────────────────────────────────────────────────────────────────
// Image result cache (Sprint 2d)
// Caches the parsed JSON response for an image hash so identical scans
// (same image content) hit the cache instead of re-calling AI.
// Keyed on SHA-256 of the image data URL — collisions astronomically unlikely.
// TTL: 30 days (images don't change meaning, unlike text questions).
// ──────────────────────────────────────────────────────────────────────

const IMAGE_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function imageCacheKey(imageDataUrl: string): Promise<string> {
  // Hash the image data URL directly (includes base64 content)
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(imageDataUrl));
  const hex = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `img:${hex}`;
}

export async function getCachedImageResult(
  imageDataUrl: string,
): Promise<{ response: string; model: string } | null> {
  const key = await imageCacheKey(imageDataUrl);
  const { data } = await supabaseAdmin
    .from("ai_response_cache")
    .select("response, model, expires_at")
    .eq("key", key)
    .maybeSingle();
  if (!data) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  return { response: data.response, model: data.model };
}

export async function setCachedImageResult(args: {
  imageDataUrl: string;
  response: string;
  model: string;
}): Promise<void> {
  const key = await imageCacheKey(args.imageDataUrl);
  const expires_at = new Date(Date.now() + IMAGE_CACHE_TTL_MS).toISOString();
  await supabaseAdmin.from("ai_response_cache").upsert({
    key,
    response: args.response,
    model: args.model,
    tier: 2, // generic, not personalized
    expires_at,
  });
}
