/**
 * /discover — search & follow users.
 */
import { createFileRoute } from "@tanstack/react-router";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { UserSearchBar } from "@/features/groups/components/UserSearchBar";
import { Users } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/discover")({
  component: DiscoverPage,
});

function DiscoverPage() {
  const { t } = useTranslation();

  return (
    <main className="min-h-dvh bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-2 space-y-5">
        <TopAppBar title={t("discover.title")} subtitle={t("discover.subtitle")} showBack />

        <Link
          to="/community"
          className="flex items-center gap-3 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 p-3 rounded-2xl"
        >
          <Users className="size-5 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-semibold">{t("discover.publicCommunity")}</p>
            <p className="text-[11px] text-muted-foreground">{t("discover.seeAllPosts")}</p>
          </div>
        </Link>

        <UserSearchBar />
      </div>
      <BottomNav />
    </main>
  );
}
