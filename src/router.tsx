import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { RouteError, RouteNotFound } from "@/components/healthyu/route-boundaries";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Anggap data fresh selama 30 detik → kurangi refetch saat focus/mount ulang
        staleTime: 30_000,
        // Cache disimpan 5 menit setelah unmount
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
      mutations: {
        retry: 0,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // Preserve referential identity untuk search params/loader data → kurangi re-render
    defaultStructuralSharing: true,
    defaultErrorComponent: RouteError,
    defaultNotFoundComponent: RouteNotFound,
  });

  return router;
};
