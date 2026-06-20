import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Deprecated: /recipes (bare) now redirects to the public /resep hub.
 * The new recipe surface is /resep/* — see /resep/$slug for the detail
 * page (with bookmark, rating, reviews, AI remix all auth-gated) and
 * /resep/tersimpan for saved recipes.
 *
 * Public route (not under _authenticated) so that anon users also get the
 * redirect to /resep instead of being bounced to /auth first.
 */
export const Route = createFileRoute("/recipes")({
  beforeLoad: () => {
    throw redirect({ to: "/resep" });
  },
});
