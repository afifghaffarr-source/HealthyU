import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /recipes/import → /resep
 *
 * The URL recipe importer was removed in Sprint 5b (YAGNI: low usage,
 * not integrated with the /resep data model). Users can browse curated
 * recipes at /resep and search from there.
 */
export const Route = createFileRoute("/recipes/import")({
  beforeLoad: () => {
    throw redirect({ to: "/resep" });
  },
});
