import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSlugFromRecipeId } from "@/features/recipes/lib/recipeSlugLookup.functions";
import { clientSafeError } from "@/lib/clientLogSafe";

/**
 * /recipes/$id → /resep/$slug
 *
 * The old authenticated detail route used a UUID id. We look it up in the
 * recipes table, then confirm the slug is published in seo_recipes (the
 * public marketing table that /resep/$slug reads from). If both succeed,
 * redirect to the new public URL; otherwise fall back to /resep.
 *
 * Sibling child routes (recipes.$id.remix, recipes.$id.reviews) are
 * handled implicitly: TanStack's parent route's `beforeLoad` runs first,
 * and any path under /recipes/$id hits THIS file before the deeper
 * child files. The old remix/reviews sub-routes are dead (the new public
 * detail page shows remix as a modal and reviews as a section), so we
 * redirect every /recipes/$id/* path here too.
 *
 * Public route (not under _authenticated) so anon users get redirected
 * to /resep instead of being bounced to /auth.
 *
 * Note: 13 recipes exist in `recipes` table with `is_published=true` but
 * haven't been promoted to `seo_recipes` yet. For these, the slug lookup
 * returns null and we fall back to /resep. Once the data sync is fixed,
 * those UUIDs will redirect directly to /resep/<slug>.
 */
export const Route = createFileRoute("/recipes/$id")({
  beforeLoad: async ({ params }) => {
    const id = params.id;

    // Looks like a UUID → look up the slug
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      try {
        const result = await getSlugFromRecipeId({ data: { id } });
        if (result?.slug) {
          throw redirect({ to: "/resep/$slug", params: { slug: result.slug } });
        }
      } catch (err) {
        // Re-throw redirects (they're not errors)
        if (err && typeof err === "object" && "status" in err && "headers" in err) {
          throw err;
        }
        // Silently fall through to /resep on query error
        clientSafeError("recipes.$id", err, { id });
      }
    }

    // Anything else (non-UUID id, or UUID with no published slug, or
    // lookup error) → /resep
    throw redirect({ to: "/resep" });
  },
});
