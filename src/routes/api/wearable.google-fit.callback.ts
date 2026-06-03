import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/wearable/google-fit/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state"); // userId
        const err = url.searchParams.get("error");
        if (err) return redirectBack(url.origin, `Google Fit: ${err}`);
        if (!code || !state) return redirectBack(url.origin, "Parameter OAuth tidak lengkap");

        const clientId = process.env.GOOGLE_FIT_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_FIT_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
          return redirectBack(url.origin, "Server belum di-set GOOGLE_FIT credentials");
        }

        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: `${url.origin}/api/wearable/google-fit/callback`,
            grant_type: "authorization_code",
          }),
        });
        if (!tokenRes.ok) {
          const t = await tokenRes.text();
          return redirectBack(url.origin, `Token exchange gagal: ${t.slice(0, 120)}`);
        }
        const tok = (await tokenRes.json()) as {
          access_token: string;
          refresh_token?: string;
          expires_in: number;
          scope?: string;
        };
        if (!tok.refresh_token) {
          return redirectBack(url.origin, "Tidak dapat refresh_token. Cabut akses lalu coba lagi.");
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const expires = new Date(Date.now() + tok.expires_in * 1000).toISOString();
        const { error } = await supabaseAdmin.from("wearable_tokens").upsert(
          {
            user_id: state,
            provider: "google_fit",
            access_token: tok.access_token,
            refresh_token: tok.refresh_token,
            expires_at: expires,
            scope: tok.scope ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );
        if (error) return redirectBack(url.origin, `DB error: ${error.message}`);

        return Response.redirect(`${url.origin}/wearable?connected=1`, 302);
      },
    },
  },
});

function redirectBack(origin: string, msg: string) {
  const u = new URL(`${origin}/wearable`);
  u.searchParams.set("error", msg);
  return Response.redirect(u.toString(), 302);
}