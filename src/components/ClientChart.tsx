import { useEffect, useState, type ReactNode } from "react";

/**
 * AUDIT-009 fix: render a component only on the client by dynamic-importing
 * it inside useEffect. Prevents heavy client-only libs (recharts, etc.) from
 * being loaded during SSR, so the worker cold start doesn't have to parse
 * the chart bundle.
 *
 * Why not React.lazy?
 * - React.lazy's import is resolved during SSR (it awaits the module to
 *   render the fallback vs component), so the lazy module still gets
 *   executed on the server and Vite includes it in the server bundle.
 * - useEffect never runs on the server, so the dynamic import inside it is
 *   truly client-only. The fallback renders on SSR; the chart hydrates
 *   on the client after a tiny flash of the skeleton.
 *
 * Note: Vite's SSR build still follows the dynamic `import("@/...")` string
 * at build time and creates a chunk for it. The chunk exists in
 * dist/server/assets/ but loads on-demand (only when an actual request
 * hits a chart page) rather than being part of the worker's initial load.
 *
 * Usage:
 *   <ClientChart
 *     loader={() => import("@/components/charts/weight-area-chart")
 *       .then(m => ({ Component: m.default }))}
 *     props={{ data, target }}
 *     fallback={<div className="h-44 animate-pulse bg-muted" />}
 *   />
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = React.ComponentType<any>;

interface ClientChartProps {
  loader: () => Promise<{ Component: AnyComponent }>;
  props?: Record<string, unknown>;
  fallback: ReactNode;
  className?: string;
}

export function ClientChart({ loader, props = {}, fallback, className }: ClientChartProps) {
  const [Component, setComponent] = useState<AnyComponent | null>(null);
  useEffect(() => {
    let cancelled = false;
    loader().then(({ Component: C }) => {
      if (!cancelled) setComponent(() => C);
    });
    return () => {
      cancelled = true;
    };
  }, [loader]);
  return <div className={className}>{Component ? <Component {...props} /> : fallback}</div>;
}
