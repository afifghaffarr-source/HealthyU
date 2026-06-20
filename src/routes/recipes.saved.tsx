import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /recipes/saved → /resep/tersimpan
 *
 * The /recipes namespace has been consolidated to /resep/* (Sprint 5b).
 * Saved recipes now live under /resep/tersimpan.
 */
export const Route = createFileRoute("/recipes/saved")({
  beforeLoad: () => {
    throw redirect({ to: "/resep/tersimpan" });
  },
});
