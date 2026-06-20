import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /recipes/recommendations → /resep/tersimpan
 *
 * The /recipes namespace has been consolidated to /resep/* (Sprint 5b).
 * Personalized recommendations were an authenticated dashboard feature; the
 * public surface (/resep) now surfaces trending + new recipes directly, and
 * auth-gated "Rekomendasi Untukmu" lives on each /resep/$slug page.
 */
export const Route = createFileRoute("/recipes/recommendations")({
  beforeLoad: () => {
    throw redirect({ to: "/resep/tersimpan" });
  },
});
