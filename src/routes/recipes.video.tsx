import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /recipes/video → /resep
 *
 * The cooking-video player was removed in Sprint 5b (YAGNI: never
 * integrated with real video data, feature surface was placeholder).
 * Browse the curated recipe list at /resep instead.
 */
export const Route = createFileRoute("/recipes/video")({
  beforeLoad: () => {
    throw redirect({ to: "/resep" });
  },
});
