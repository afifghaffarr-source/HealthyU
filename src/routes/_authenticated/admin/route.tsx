import { createFileRoute, Outlet, redirect, useLocation, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  ScrollText,
  Newspaper,
  Server,
  Sprout,
  ChevronRight,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TopAppBar } from "@/components/healthyu/top-app-bar";

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
};

const NAV: NavItem[] = [
  {
    to: "/admin",
    label: "Overview",
    icon: LayoutDashboard,
    description: "Ringkasan sistem, traffic, error, dan AI usage.",
  },
  {
    to: "/admin/recipes",
    label: "Recipes",
    icon: BookOpen,
    description: "Kelola resep, publish toggle, dan regenerate image.",
  },
  {
    to: "/admin/users",
    label: "Users",
    icon: Users,
    description: "Cari user, lihat role, grant admin.",
  },
  {
    to: "/admin/audit",
    label: "Audit Log",
    icon: ScrollText,
    description: "Privacy events: deletion, export, consent change.",
  },
  {
    to: "/admin/articles",
    label: "Articles",
    icon: Newspaper,
    description: "Kelola artikel dan konten SEO.",
  },
  {
    to: "/admin/seed-recipes",
    label: "Seed Recipes",
    icon: Sprout,
    description: "Generate resep baru via AI (bulk).",
  },
  {
    to: "/admin/system",
    label: "System",
    icon: Server,
    description: "Cron job status, backup, error rate.",
  },
];

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw redirect({ to: "/auth" });
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw redirect({ to: "/" });
  },
  component: AdminLayout,
});

function AdminLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auto-close mobile sidebar on route change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external-store/async-query sync; `useSyncExternalStore` and equivalent restructure would change the API surface
    setSidebarOpen(false);
  }, [location.pathname]);

  const isActive = (to: string) => {
    if (to === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(to);
  };

  return (
    <div className="min-h-dvh bg-background">
      <TopAppBar title="Admin Panel" showBack />

      <div className="flex">
        {/* Sidebar — desktop */}
        <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-black/5 md:bg-card md:min-h-[calc(100dvh-64px)] md:sticky md:top-16">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-black/5">
            <ShieldCheck className="size-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Admin tools
            </span>
          </div>
          <nav className="flex-1 p-2 space-y-0.5">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-start gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                  isActive(item.to)
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted text-foreground"
                }`}
              >
                <item.icon className="size-4 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                </div>
              </Link>
            ))}
          </nav>
          <div className="p-3 border-t border-black/5 text-xs text-muted-foreground">
            <p>
              Role: <span className="font-mono">admin</span>
            </p>
            <p>All actions audit-logged.</p>
          </div>
        </aside>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/40"
            onClick={() => setSidebarOpen(false)}
          >
            <aside
              className="absolute left-0 top-0 bottom-0 w-72 bg-card shadow-xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-black/5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-primary" />
                  <span className="font-semibold">Admin tools</span>
                </div>
                <button
                  className="text-xs text-muted-foreground"
                  onClick={() => setSidebarOpen(false)}
                >
                  Tutup
                </button>
              </div>
              <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
                {NAV.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-start gap-3 rounded-xl px-3 py-2 text-sm ${
                      isActive(item.to)
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted text-foreground"
                    }`}
                  >
                    <item.icon className="size-4 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                  </Link>
                ))}
              </nav>
            </aside>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {/* Mobile breadcrumb + sidebar toggle */}
          <div className="md:hidden sticky top-16 z-30 bg-background border-b border-black/5 px-4 py-2 flex items-center justify-between">
            <button
              className="text-xs font-semibold text-primary"
              onClick={() => setSidebarOpen(true)}
            >
              Menu admin
            </button>
            <Breadcrumb />
          </div>
          {/* Desktop breadcrumb */}
          <div className="hidden md:flex items-center gap-1 px-6 pt-4 pb-2 text-xs text-muted-foreground">
            <Link to="/admin" className="hover:text-foreground">
              Admin
            </Link>
            <ChevronRight className="size-3" />
            <Breadcrumb />
          </div>

          <div className="p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function Breadcrumb() {
  const location = useLocation();
  const segs = location.pathname.split("/").filter(Boolean);
  const last = segs[segs.length - 1];
  const label = NAV.find((n) => n.to.endsWith(last))?.label ?? last;
  return <span className="font-medium text-foreground capitalize">{label}</span>;
}
