import { createFileRoute } from "@tanstack/react-router";
import { APP_CONFIG } from "@/config/app";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const body = {
          ok: true,
          app: APP_CONFIG.name,
          time: new Date().toISOString(),
          version: process.env.npm_package_version ?? "0.0.0",
          env: process.env.NODE_ENV ?? "development",
        };
        return new Response(JSON.stringify(body, null, 2), {
          status: 200,
          headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        });
      },
    },
  },
});
