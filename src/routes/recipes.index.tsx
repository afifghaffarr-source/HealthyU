import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * English alias for /resep — redirects to the canonical Indonesian path.
 * Why: users naturally type /recipes (English) but the app uses /resep.
 *
 * Note: /recipes (bare) and /recipes/<anything> are handled by sibling
 * files (recipes.tsx deleted; recipes.saved.tsx, recipes.import.tsx,
 * recipes.video.tsx, recipes.recommendations.tsx, recipes.$id.tsx are
 * siblings under root). This file's path `/recipes/` matches the bare
 * `/recipes` URL after TanStack Router's trailing-slash normalization.
 *
 * Behavior:
 *   /recipes    → 301 → /resep       (1-hop, via this route)
 *   /recipes/   → 307 → /recipes → 301 → /resep  (2-hop: TanStack strips
 *     trailing slash first, then this route fires; this matches the
 *     built-in /resep/ → /resep behavior across the app)
 */
export const Route = createFileRoute("/recipes/")({
  beforeLoad: () => {
    throw redirect({ to: "/resep", statusCode: 301 });
  },
});
