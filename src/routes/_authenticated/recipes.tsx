import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Deprecated: /recipes (bare) now redirects to the public /resep hub.
 * The new recipe surface is /resep/* — see /resep/$slug for the detail
 * page (with bookmark, rating, reviews, AI remix all auth-gated) and
 * /resep/tersimpan for saved recipes.
 */
export const Route = createFileRoute("/_authenticated/recipes")({
  beforeLoad: () => {
    throw redirect({ to: "/resep" });
  },
});
