import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider";
import { ReminderScheduler } from "@/components/reminder-scheduler";
import { InstallPrompt } from "@/components/install-prompt";
import { LiveAnnouncerProvider } from "@/components/live-announcer";
import { I18nProvider } from "@/lib/i18n";
import { DesktopSidebar } from "@/components/healthyu/desktop-sidebar";
import { GlobalErrorBoundary } from "@/components/healthyu/global-error-boundary";
import { CommandPalette } from "@/components/healthyu/command-palette";
import { QuickActionFab } from "@/components/healthyu/quick-action-fab";

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

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
      { property: "og:image", content: "https://healthyu.id/icon-512.svg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "HealthyU — Sahabat Sehat Berbasis AI" },
      { name: "twitter:description", content: "Diet, puasa, dan kesehatan holistik berbasis AI untuk Indonesia." },
      { name: "twitter:image", content: "https://healthyu.id/icon-512.svg" },
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
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      // Preconnect ke Supabase storage/API → kurangi handshake TLS untuk request awal
      { rel: "preconnect", href: "https://tpyckpdlzpbfguyrgeuy.supabase.co", crossOrigin: "anonymous" },
      { rel: "dns-prefetch", href: "https://tpyckpdlzpbfguyrgeuy.supabase.co" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": "https://healthyu.id/#organization",
              name: "HealthyU",
              url: "https://healthyu.id",
              logo: "https://healthyu.id/icon-512.svg",
              description:
                "Aplikasi diet, puasa, dan kesehatan holistik berbasis AI untuk Indonesia.",
              sameAs: [],
            },
            {
              "@type": "WebSite",
              "@id": "https://healthyu.id/#website",
              url: "https://healthyu.id",
              name: "HealthyU",
              inLanguage: "id-ID",
              publisher: { "@id": "https://healthyu.id/#organization" },
              potentialAction: {
                "@type": "SearchAction",
                target: "https://healthyu.id/cari?q={search_term_string}",
                "query-input": "required name=search_term_string",
              },
            },
            {
              "@type": "WebApplication",
              name: "HealthyU",
              url: "https://healthyu.id",
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
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
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
            <ReminderScheduler />
            <DesktopSidebar />
            <div className="lg:pl-64">
              <GlobalErrorBoundary>
                <Outlet />
              </GlobalErrorBoundary>
            </div>
            <InstallPrompt />
            <CommandPalette />
            <QuickActionFab />
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
  useEffect(() => {
    const url = new URL(window.location.href);
    const previewToken = url.searchParams.get("__lovable_token");
    const manifestHref = previewToken
      ? `/manifest.json?__lovable_token=${encodeURIComponent(previewToken)}`
      : "/manifest.json";

    let link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "manifest";
      document.head.appendChild(link);
    }
    link.href = manifestHref;
  }, []);

  return null;
}
