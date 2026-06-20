import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/toaster";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider";
import { InstallPrompt } from "@/components/install-prompt";
import { SWUpdateToast } from "@/components/sw-update-toast";
import { LiveAnnouncerProvider } from "@/components/live-announcer";
import { I18nProvider } from "@/lib/i18n";
import { GlobalErrorBoundary } from "@/components/healthyu/global-error-boundary";
import { RouteError, RouteNotFound } from "@/components/healthyu/route-boundaries";
import { ScrollToTopButton } from "@/components/healthyu/scroll-to-top-button";
import { RouteProgressBar } from "@/components/healthyu/route-progress-bar";
import { APP_CONFIG } from "@/config/app";
import { startBackgroundSync } from "@/lib/dexie-sync";
import { initWebVitals } from "@/lib/webVitals";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "HealthyU — Sahabat Sehat Berbasis AI" },
      {
        name: "description",
        content: "Diet, puasa, dan kesehatan holistik berbasis AI untuk Indonesia.",
      },
      { name: "author", content: "HealthyU" },
      { property: "og:title", content: "HealthyU — Sahabat Sehat Berbasis AI" },
      {
        property: "og:description",
        content: "Diet, puasa, dan kesehatan holistik berbasis AI untuk Indonesia.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "HealthyU" },
      { property: "og:locale", content: "id_ID" },
      { property: "og:image", content: `${APP_CONFIG.siteUrl}/icon-512.svg` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "HealthyU — Sahabat Sehat Berbasis AI" },
      {
        name: "twitter:description",
        content: "Diet, puasa, dan kesehatan holistik berbasis AI untuk Indonesia.",
      },
      { name: "twitter:image", content: `${APP_CONFIG.siteUrl}/icon-512.svg` },
      { name: "theme-color", content: "#6B8E5A" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "HealthyU" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "apple-touch-icon", href: "/icon-192.svg" },
      // Fonts (Geist Variable + Geist Mono) self-hosted at /fonts/*.woff2 — no Google Fonts <link>.
      // Preconnect ke Supabase storage/API → kurangi handshake TLS untuk request awal
      ...(import.meta.env.VITE_SUPABASE_URL
        ? [
            {
              rel: "preconnect",
              href: import.meta.env.VITE_SUPABASE_URL,
              crossOrigin: "anonymous" as const,
            },
            { rel: "dns-prefetch", href: import.meta.env.VITE_SUPABASE_URL },
          ]
        : []),
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": `${APP_CONFIG.siteUrl}/#organization`,
              name: "HealthyU",
              url: APP_CONFIG.siteUrl,
              logo: `${APP_CONFIG.siteUrl}/icon-512.svg`,
              description:
                "Aplikasi diet, puasa, dan kesehatan holistik berbasis AI untuk Indonesia.",
              sameAs: [],
            },
            {
              "@type": "WebSite",
              "@id": `${APP_CONFIG.siteUrl}/#website`,
              url: APP_CONFIG.siteUrl,
              name: "HealthyU",
              inLanguage: "id-ID",
              publisher: { "@id": `${APP_CONFIG.siteUrl}/#organization` },
              potentialAction: {
                "@type": "SearchAction",
                target: `${APP_CONFIG.siteUrl}/cari?q={search_term_string}`,
                "query-input": "required name=search_term_string",
              },
            },
            {
              "@type": "WebApplication",
              name: "HealthyU",
              url: APP_CONFIG.siteUrl,
              applicationCategory: "HealthApplication",
              operatingSystem: "Web, iOS, Android",
              offers: { "@type": "Offer", price: "0", priceCurrency: "IDR" },
            },
          ],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: RouteNotFound,
  errorComponent: RouteError,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <LiveAnnouncerProvider>
            <ManifestLinkManager />
            <AuthListener />
            <RouteProgressBar />
            <GlobalErrorBoundary>
              <Outlet />
            </GlobalErrorBoundary>
            <InstallPrompt />
            <SWUpdateToast />
            <ScrollToTopButton />
            <Toaster position="top-center" />
          </LiveAnnouncerProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function AuthListener() {
  const router = useRouter();
  const queryClient = useQueryClient();
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      // Ignore high-frequency events (TOKEN_REFRESHED fires ~hourly + on focus,
      // INITIAL_SESSION fires on every mount) — they would thrash router + query cache.
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      // On SIGNED_OUT, the auth gate redirects to /auth; refetching protected
      // queries with no session would just storm 401s.
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => subscription.unsubscribe();
  }, [router, queryClient]);
  return null;
}

function ManifestLinkManager() {
  // PWA manifest served as static asset. vite-plugin-pwa emits
  // /manifest.webmanifest during build; we fall back to /manifest.json.
  // (Previously we read ?__lovable_token to authenticate preview deploys on
  // Lovable's static CDN — that auth mechanism is gone with the platform.)
  useEffect(() => {
    const link =
      (document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null) ??
      Object.assign(document.createElement("link"), { rel: "manifest" });
    if (!link.isConnected) document.head.appendChild(link);
    link.href = "/manifest.webmanifest";
  }, []);

  // Start Dexie background sync (offline-first water logs → Supabase).
  // Runs periodically + on network reconnect + on app focus.
  useEffect(() => startBackgroundSync(), []);

  // Start web-vitals reporting. Only logs "needs-improvement" and "poor"
  // ratings (per Google thresholds) to avoid flooding error_reports.
  // Reuses the existing /api/log-error pipeline via reportError.
  useEffect(() => initWebVitals(), []);

  return null;
}
