import { ReactNode } from "react";
import { TopAppBar } from "./top-app-bar";
import { BottomNav } from "../bottom-nav";
import { Loader2 } from "lucide-react";

type PageShellProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  showBottomNav?: boolean;
  loading?: boolean;
  error?: Error | null;
  empty?: {
    show: boolean;
    icon?: ReactNode;
    title: string;
    description?: string;
    action?: ReactNode;
  };
};

/**
 * Phase 4: Standardized page layout with consistent empty/loading/error states.
 * Wraps content with TopAppBar + BottomNav, handles common UI patterns.
 */
export function PageShell({
  children,
  title,
  subtitle,
  showBack = false,
  showBottomNav = true,
  loading = false,
  error = null,
  empty,
}: PageShellProps) {
  return (
    <main className="min-h-dvh bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-2 space-y-5">
        {title && <TopAppBar title={title} subtitle={subtitle} showBack={showBack} />}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Memuat...</p>
          </div>
        ) : error ? (
          <div className="bg-destructive/10 text-destructive rounded-3xl p-6 text-center space-y-2">
            <p className="font-semibold">Terjadi kesalahan</p>
            <p className="text-sm opacity-90">{error.message || "Coba lagi nanti"}</p>
          </div>
        ) : empty?.show ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            {empty.icon && <div className="text-muted-foreground">{empty.icon}</div>}
            <div>
              <p className="font-semibold text-base">{empty.title}</p>
              {empty.description && (
                <p className="text-sm text-muted-foreground mt-1">{empty.description}</p>
              )}
            </div>
            {empty.action}
          </div>
        ) : (
          children
        )}
      </div>
      {showBottomNav && <BottomNav />}
    </main>
  );
}
