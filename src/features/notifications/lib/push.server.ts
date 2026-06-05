// Web Push (RFC 8291) implementasi dengan Web Crypto.
// Bekerja di Cloudflare Workers runtime.

import { VAPID_PUBLIC_KEY } from "@/lib/push-config";

type PushSub = { endpoint: string; p256dh: string; auth: string };
type PushPayload = { title: string; body: string; url?: string; tag?: string; icon?: string };

function b64urlToBuf(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function bufToB64url(buf: ArrayBuffer | Uint8Array): string {
  const u = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Cast helper to satisfy strict BufferSource typing under TS 5.7.
const bs = (u: Uint8Array): BufferSource => u as unknown as BufferSource;

function concat(...arrs: Uint8Array[]): Uint8Array {
  const len = arrs.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const a of arrs) {
    out.set(a, o);
    o += a.length;
  }
  return out;
}

async function importVapidPrivKey(d: string, pubRaw: Uint8Array) {
  // pubRaw uncompressed: 0x04 || x(32) || y(32)
  const x = pubRaw.slice(1, 33);
  const y = pubRaw.slice(33, 65);
  const jwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    d: bufToB64url(b64urlToBuf(d)),
    x: bufToB64url(x),
    y: bufToB64url(y),
    ext: true,
  };
  return crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, [
    "sign",
  ]);
}

async function signJwt(privKey: CryptoKey, header: object, payload: object): Promise<string> {
  const enc = new TextEncoder();
  const h = bufToB64url(enc.encode(JSON.stringify(header)));
  const p = bufToB64url(enc.encode(JSON.stringify(payload)));
  const input = `${h}.${p}`;
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privKey,
    bs(enc.encode(input)),
  );
  return `${input}.${bufToB64url(sig)}`;
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number) {
  const key = await crypto.subtle.importKey("raw", bs(ikm), { name: "HKDF" }, false, [
    "deriveBits",
  ]);
  return new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt: bs(salt), info: bs(info) },
      key,
      length * 8,
    ),
  );
}

async function encryptAes128Gcm(key: Uint8Array, nonce: Uint8Array, data: Uint8Array) {
  const k = await crypto.subtle.importKey("raw", bs(key), { name: "AES-GCM" }, false, ["encrypt"]);
  return new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: bs(nonce), tagLength: 128 }, k, bs(data)),
  );
}

/**
 * Encrypt payload using aes128gcm content-encoding (RFC 8188).
 * Returns full body that goes into the POST request to the push service.
 */
async function encryptPayload(
  subPubRaw: Uint8Array, // 65-byte uncompressed
  subAuth: Uint8Array, // 16 bytes
  payload: Uint8Array,
): Promise<{ body: Uint8Array }> {
  // 1. Ephemeral ECDH keypair
  const ephemeral = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
    "deriveBits",
  ]);
  const ephPubRaw = new Uint8Array(await crypto.subtle.exportKey("raw", ephemeral.publicKey));

  // 2. Import subscriber pubkey
  const subPub = await crypto.subtle.importKey(
    "raw",
    bs(subPubRaw),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );

  // 3. Shared secret
  const ecdh = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: subPub }, ephemeral.privateKey, 256),
  );

  // 4. Salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // 5. PRK_key from auth + ecdh
  const keyInfo = concat(new TextEncoder().encode("WebPush: info\0"), subPubRaw, ephPubRaw);
  const ikm = await hkdf(subAuth, ecdh, keyInfo, 32);

  // 6. Derive CEK and nonce
  const cek = await hkdf(salt, ikm, new TextEncoder().encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, new TextEncoder().encode("Content-Encoding: nonce\0"), 12);

  // 7. Pad: payload || 0x02
  const padded = concat(payload, new Uint8Array([0x02]));
  const ciphertext = await encryptAes128Gcm(cek, nonce, padded);

  // 8. Header: salt(16) || rs(4, big-endian, 4096) || idlen(1)=65 || keyid(65)=ephPub
  const rs = new Uint8Array([0, 0, 0x10, 0]); // 4096
  const header = concat(salt, rs, new Uint8Array([65]), ephPubRaw);

  return { body: concat(header, ciphertext) };
}

export async function sendWebPushTo(
  sub: PushSub,
  payload: PushPayload,
): Promise<{ ok: boolean; status: number }> {
  const privKeyB64 = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:support@healthyu.id";
  if (!privKeyB64) {
    throw new Error("VAPID_PRIVATE_KEY belum dikonfigurasi sebagai secret");
  }

  const pubRaw = b64urlToBuf(VAPID_PUBLIC_KEY);
  const privKey = await importVapidPrivKey(privKeyB64, pubRaw);

  // VAPID JWT
  const aud = new URL(sub.endpoint).origin;
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600;
  const jwt = await signJwt(privKey, { typ: "JWT", alg: "ES256" }, { aud, exp, sub: subject });

  const subPubRaw = b64urlToBuf(sub.p256dh);
  const subAuth = b64urlToBuf(sub.auth);
  const data = new TextEncoder().encode(JSON.stringify(payload));
  const { body } = await encryptPayload(subPubRaw, subAuth, data);

  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      Authorization: `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: "86400",
    },
    body: body as unknown as BodyInit,
  });

  if (!res.ok && res.status !== 201) {
    const text = await res.text().catch(() => "");
    throw new Error(`Push gagal ${res.status}: ${text.slice(0, 200)}`);
  }
  return { ok: true, status: res.status };
}
