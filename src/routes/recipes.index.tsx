import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * English alias for /resep — redirects to the canonical Indonesian path.
 * Why: users naturally type /recipes (English) but the app uses /resep.
 * Without this alias, /recipes/ matches the _authenticated/recipes route
 * (a logged-in user's personal recipe list) and bounces unauthenticated
 * visitors to /auth, which looks like "recipes don't show up".
 */
export const Route = createFileRoute("/recipes/")({
  beforeLoad: () => {
    throw redirect({ to: "/resep", statusCode: 301 });
  },
});
