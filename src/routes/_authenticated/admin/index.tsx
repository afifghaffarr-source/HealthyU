import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  BookOpen,
  Newspaper,
  Sparkles,
  TrendingUp,
  Clock,
  ShieldCheck,
  ImageOff,
  Image as ImageIcon,
  Activity,
  Bell,
} from "lucide-react";
import { getAdminOverview } from "@/features/admin/lib/adminOverview.functions";
import { useTranslation } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminOverviewPage,
});

type Overview = Awaited<ReturnType<typeof getAdminOverview>>;

function AdminOverviewPage() {
  const { t } = useTranslation();
  const { data, isLoading, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => getAdminOverview({ data: {} }),
    staleTime: 60_000, // 1 min
    refetchOnWindowFocus: true,
  });

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4">
        <p className="text-sm font-semibold text-destructive mb-1">{t("admin.index.loadFail")}</p>
        <p className="text-sm text-destructive/90 font-mono">{(error as Error).message}</p>
        <button
          onClick={() => refetch()}
          className="mt-3 px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium"
        >
          {t("admin.index.tryAgain")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{t("admin.index.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("admin.index.subtitle")}</p>
        </div>
        {dataUpdatedAt > 0 && (
          <p className="text-xs text-muted-foreground font-mono">
            {t("admin.index.lastSync", {
              time: new Date(dataUpdatedAt).toLocaleTimeString("id-ID"),
            })}
          </p>
        )}
      </header>

      {isLoading || !data ? (
        <SkeletonGrid />
      ) : (
        <>
          {/* Stat cards — 4 columns on desktop, 2 on mobile */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              icon={<Users className="size-5" />}
              label={t("admin.index.totalUsers")}
              value={data.users.total}
              sub={`+${data.users.last24h} ${t("admin.index.totalUsersSub")} · +${data.users.last7d} 7d`}
              tone="primary"
            />
            <StatCard
              icon={<ShieldCheck className="size-5" />}
              label={t("admin.index.admins")}
              value={data.users.admins}
              sub={t("admin.index.adminsSub")}
              tone="muted"
            />
            <StatCard
              icon={<BookOpen className="size-5" />}
              label={t("admin.index.recipes")}
              value={data.recipes.total}
              sub={`${data.recipes.withImage} image · ${data.recipes.last7d} 7d`}
              tone="primary"
            />
            <StatCard
              icon={<Newspaper className="size-5" />}
              label={t("admin.index.articles")}
              value={`${data.articles.published}/${data.articles.total}`}
              sub={`${data.articles.total - data.articles.published} ${t("admin.articles.draft").toLowerCase()}`}
              tone="muted"
            />
          </section>

          {/* Image coverage + Recipe activity */}
          <section className="grid lg:grid-cols-2 gap-4">
            <div className="bg-card rounded-2xl p-5 outline-1 outline-black/5">
              <div className="flex items-center gap-2 mb-3">
                <ImageIcon className="size-4 text-primary" />
                <h2 className="font-bold">{t("admin.index.imageCoverage")}</h2>
              </div>
              <CoverageBar
                total={data.recipes.total}
                covered={data.recipes.withImage}
                missing={data.recipes.total - data.recipes.withImage}
              />
              {data.recipes.total - data.recipes.withImage > 0 && (
                <p className="text-xs text-muted-foreground mt-3">
                  {t("admin.index.imageBackfillHint", {
                    cmd: "python3 scripts/gen_recipe_image.py --slug <slug>",
                  })}
                </p>
              )}
            </div>

            <div className="bg-card rounded-2xl p-5 outline-1 outline-black/5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="size-4 text-primary" />
                <h2 className="font-bold">{t("admin.index.recipesByCategory")}</h2>
              </div>
              <ul className="space-y-1.5">
                {data.recipesByCategory.slice(0, 8).map((c) => {
                  const max = data.recipesByCategory[0]?.count ?? 1;
                  const pct = Math.round((c.count / max) * 100);
                  return (
                    <li key={c.category} className="flex items-center gap-3 text-sm">
                      <span className="w-32 truncate capitalize text-muted-foreground">
                        {c.category}
                      </span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-[width] duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="font-mono font-bold tabular-nums w-8 text-right">
                        {c.count}
                      </span>
                    </li>
                  );
                })}
                {data.recipesByCategory.length === 0 && (
                  <p className="text-xs text-muted-foreground">{t("admin.index.emptyRecipes")}</p>
                )}
              </ul>
            </div>
          </section>

          {/* Recent activity */}
          <section className="grid lg:grid-cols-2 gap-4">
            <div className="bg-card rounded-2xl p-5 outline-1 outline-black/5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Activity className="size-4 text-primary" />
                  <h2 className="font-bold">{t("admin.index.recentRecipes")}</h2>
                </div>
                <Link to="/admin/recipes" className="text-xs font-semibold text-primary">
                  {t("admin.index.viewAll")}
                </Link>
              </div>
              <ul className="divide-y divide-black/5">
                {data.recentRecipes.map((r) => (
                  <li key={r.id} className="py-2 flex items-center gap-3">
                    <BookOpen className="size-3.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{r.title}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {r.slug} · {r.category ?? "—"}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                      {timeAgo(r.created_at)}
                    </span>
                  </li>
                ))}
                {data.recentRecipes.length === 0 && (
                  <p className="text-xs text-muted-foreground py-2">
                    {t("admin.index.emptyRecipes")}
                  </p>
                )}
              </ul>
            </div>

            <div className="bg-card rounded-2xl p-5 outline-1 outline-black/5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-primary" />
                  <h2 className="font-bold">{t("admin.index.recentUsers")}</h2>
                </div>
                <Link to="/admin/users" className="text-xs font-semibold text-primary">
                  {t("admin.index.viewAll")}
                </Link>
              </div>
              <ul className="divide-y divide-black/5">
                {data.recentUsers.map((u) => (
                  <li key={u.id} className="py-2 flex items-center gap-3">
                    <div className="size-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                      {(u.email ?? "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {u.email ?? t("admin.index.noEmail")}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {t("admin.index.joinedDate", {
                          date: new Date(u.created_at).toLocaleDateString("id-ID"),
                        })}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                      {u.last_sign_in_at ? timeAgo(u.last_sign_in_at) : t("admin.index.never")}
                    </span>
                  </li>
                ))}
                {data.recentUsers.length === 0 && (
                  <p className="text-xs text-muted-foreground py-2">
                    {t("admin.index.emptyRecipes")}
                  </p>
                )}
              </ul>
            </div>
          </section>

          {/* Quick links */}
          <section>
            <h2 className="font-bold text-sm uppercase tracking-wide text-muted-foreground mb-2">
              {t("admin.index.quickActions")}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <QuickAction
                to="/admin/seed-recipes"
                icon={<Sparkles className="size-4" />}
                title={t("admin.index.qaGenerateRecipesTitle")}
                desc={t("admin.index.qaGenerateRecipesDesc")}
              />
              <QuickAction
                to="/admin/audit"
                icon={<Clock className="size-4" />}
                title={t("admin.index.qaAuditLogTitle")}
                desc={t("admin.index.qaAuditLogDesc")}
              />
              <QuickAction
                to="/admin/system"
                icon={<Activity className="size-4" />}
                title={t("admin.index.qaSystemHealthTitle")}
                desc={t("admin.index.qaSystemHealthDesc")}
              />
              <QuickAction
                to="/admin/notifications"
                icon={<Bell className="size-4" />}
                title={t("admin.notif.title")}
                desc={t("admin.notif.subtitle")}
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub?: string;
  tone: "primary" | "muted";
}) {
  return (
    <div className="bg-card rounded-2xl p-4 outline-1 outline-black/5">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        <div className={tone === "primary" ? "text-primary" : ""}>{icon}</div>
        <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-3xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function CoverageBar({
  total,
  covered,
  missing,
}: {
  total: number;
  covered: number;
  missing: number;
}) {
  const { t } = useTranslation();
  const pct = total > 0 ? Math.round((covered / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-end justify-between mb-2">
        <div>
          <p className="text-3xl font-bold tabular-nums">{pct}%</p>
          <p className="text-xs text-muted-foreground">
            {t("admin.index.coverageOf", { covered, total })}
          </p>
        </div>
        {missing > 0 && (
          <div className="text-right">
            <p className="text-xs font-semibold text-amber-600 flex items-center gap-1 justify-end">
              <ImageOff className="size-3" />
              {t("admin.index.coverageMissing", { count: missing })}
            </p>
          </div>
        )}
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full transition-[width] duration-700 ${pct === 100 ? "bg-emerald-500" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function QuickAction({
  to,
  icon,
  title,
  desc,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link
      to={to}
      className="bg-card rounded-2xl p-4 outline-1 outline-black/5 hover:bg-muted transition-colors block"
    >
      <div className="flex items-center gap-2 text-primary mb-1">
        {icon}
        <p className="font-bold text-sm">{title}</p>
      </div>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </Link>
  );
}

function SkeletonGrid() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-card rounded-2xl" />
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="h-40 bg-card rounded-2xl" />
        <div className="h-40 bg-card rounded-2xl" />
      </div>
    </div>
  );
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d`;
  return new Date(iso).toLocaleDateString("id-ID", { month: "short", day: "numeric" });
}
