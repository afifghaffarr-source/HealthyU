import { createFileRoute } from "@tanstack/react-router";

/**
 * POST /api/csp-report
 *
 * Sink publik untuk laporan pelanggaran CSP dari browser.
 * Endpoint ini sengaja publik tanpa CRON_SECRET — browser tidak bisa
 * autentikasi saat mengirim laporan otomatis.
 *
 * Body dibatasi 8 KB agar tidak jadi vektor spam log.
 */
export const Route = createFileRoute("/api/csp-report")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const raw = (await request.text()).slice(0, 8_000);
          if (raw) {
            console.warn("[csp-report]", raw);
          }
        } catch {
          // sink laporan tidak boleh pernah throw
        }
        return new Response(null, {
          status: 204,
          headers: { "Cache-Control": "no-store" },
        });
      },
    },
  },
});
