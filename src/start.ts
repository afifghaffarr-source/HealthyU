import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

/**
 * Security headers — diaplikasikan ke semua response HTML/JSON.
 * Catatan: CSP sengaja TIDAK ditambahkan dulu agar tidak memblok
 * Supabase Realtime (wss), Lovable AI, Google Fonts inline style,
 * dan service worker. Tambahkan CSP terpisah setelah audit upstream.
 */
const securityHeadersMiddleware = createMiddleware().server(async ({ next }) => {
  const result = await next();
  const response = result.response;
  const headers = new Headers(response.headers);

  // Cegah MIME sniffing
  if (!headers.has("x-content-type-options")) {
    headers.set("x-content-type-options", "nosniff");
  }
  // Cegah clickjacking
  if (!headers.has("x-frame-options")) {
    headers.set("x-frame-options", "DENY");
  }
  // Minim leak URL ke third-party
  if (!headers.has("referrer-policy")) {
    headers.set("referrer-policy", "strict-origin-when-cross-origin");
  }
  // Paksa HTTPS 1 tahun (subdomain include). Aman karena app sudah HTTPS-only.
  if (!headers.has("strict-transport-security")) {
    headers.set(
      "strict-transport-security",
      "max-age=31536000; includeSubDomains",
    );
  }
  // Batasi akses sensor browser yang tidak dipakai
  if (!headers.has("permissions-policy")) {
    headers.set(
      "permissions-policy",
      "camera=(self), microphone=(), geolocation=(self), payment=(), usb=()",
    );
  }
  // Isolasi cross-origin (aman untuk app yang tidak embed third-party widget)
  if (!headers.has("cross-origin-opener-policy")) {
    headers.set("cross-origin-opener-policy", "same-origin");
  }

  return {
    ...result,
    response: new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    }),
  };
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware, securityHeadersMiddleware],
}));
