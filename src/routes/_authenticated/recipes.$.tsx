import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSlugFromRecipeId } from "@/features/recipes/lib/recipeSlugLookup.functions";

/**
 * Catch-all redirect for the deprecated /recipes/* routes.
 * Maps old authenticated URLs to the new public /resep/* surface.
 *
 * Mapping:
 *   /recipes                       → /resep
 *   /recipes/saved                 → /resep/tersimpan
 *   /recipes/recommendations       → /resep/tersimpan
 *   /recipes/$id                   → /resep/$slug  (via id → slug lookup)
 *   /recipes/$id/remix             → /resep/$slug  (remix is now a modal)
 *   /recipes/$id/reviews           → /resep/$slug  (reviews is now a section)
 *   /recipes/import                → /resep        (URL importer removed)
 *   /recipes/video                 → /resep        (cooking player removed)
 *   anything else                  → /resep
 */
export const Route = createFileRoute("/_authenticated/recipes/$")({
  beforeLoad: async ({ params }) => {
    const splat = params._splat ?? "";
    const parts = splat.split("/").filter(Boolean);
    const first = parts[0] ?? "";

    if (first === "saved" || first === "recommendations") {
      throw redirect({ to: "/resep/tersimpan" });
    }

    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(first)) {
      try {
        const { slug } = await getSlugFromRecipeId({ data: { id: first } });
        if (slug) {
          throw redirect({ to: "/resep/$slug", params: { slug } });
        }
      } catch (e) {
        // If redirect() was thrown inside the server fn, re-throw it.
        if (e instanceof Response || (e as { statusCode?: number })?.statusCode) throw e;
        // fall through to /resep
      }
    }

    throw redirect({ to: "/resep" });
  },
});
