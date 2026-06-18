import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * English alias for /resep/$slug — redirects to the canonical Indonesian
 * detail path. Same rationale as recipes.index.tsx: without this alias,
 * /recipes/{anything} matches _authenticated/recipes.$id and either 404s
 * or redirects to /auth.
 */
export const Route = createFileRoute("/recipes/$slug")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/resep/$slug",
      params: { slug: params.slug },
      statusCode: 301,
    });
  },
});
