import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import {
  Bell,
  Download,
  Lock,
  MessageCircle,
  Palette,
  Globe,
  HelpCircle,
  Info,
  ChevronRight,
  Languages,
  Ruler,
  Clock,
  User as UserIcon,
  Sparkles,
  Brain,
  Gift,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "@/lib/i18n";
import { useRedeemPromo } from "@/hooks/use-promo-banners";

export const Route = createFileRoute("/_authenticated/pengaturan")({
  component: PengaturanPage,
});

type SettingItem = {
  to: string;
  icon: typeof Bell;
  title: string;
  description: string;
  badge?: string;
  tone?: "default" | "primary";
};

function PengaturanPage() {
  const location = useLocation();
  const { t } = useTranslation();

  // Render child route content when on a sub-route (e.g., /pengaturan/preferensi)
  if (location.pathname !== "/pengaturan") {
    return <Outlet />;
  }

  const groups: { label: string; items: SettingItem[] }[] = [
    {
      label: t("settings.account"),
      items: [
        {
          to: "/profile",
          icon: UserIcon,
          title: t("settings.profile"),
          description: "Nama, foto, biodata, target kesehatan",
        },
        {
          to: "/profile/privacy",
          icon: Lock,
          title: t("settings.privacy"),
          description: "Audit, PII redaction, hapus akun",
        },
        {
          to: "/backup",
          icon: Download,
          title: t("settings.backup"),
          description: "Unduh data pribadi (JSON/CSV)",
          tone: "primary",
        },
      ],
    },
    {
      label: t("settings.experience"),
      items: [
        {
          to: "/pengaturan/preferensi",
          icon: Palette,
          title: t("settings.preferences"),
          description: "Unit, bahasa, tema, timezone",
          tone: "primary",
        },
        {
          to: "/notifications",
          icon: Bell,
          title: t("settings.notifications"),
          description: "Push, pengingat sahur/buka, dsb",
        },
        {
          to: "/pengaturan/chat",
          icon: MessageCircle,
          title: t("settings.chatSettings"),
          description: "Retensi pesan, audit chat",
        },
        {
          to: "/profile/pattern-settings",
          icon: Brain,
          title: t("settings.patternDetection"),
          description: "Sensitivitas & threshold pola makan",
        },
      ],
    },
    {
      label: t("settings.about"),
      items: [
        {
          to: "/privacy",
          icon: Info,
          title: t("settings.privacyPolicy"),
          description: "UU PDP No. 27/2022",
        },
        {
          to: "/faq",
          icon: HelpCircle,
          title: t("settings.faq"),
          description: "Pertanyaan yang sering ditanya",
        },
      ],
    },
  ];

  return (
    <main className="min-h-dvh bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-2 space-y-5">
        <TopAppBar title={t("settings.title")} subtitle={t("settings.subtitle")} showBack />

        {/* Hero / status banner */}
        <section className="bg-gradient-to-br from-sage/10 to-primary/5 p-4 rounded-2xl outline-1 outline-primary/20 flex items-center gap-3 animate-fade-up">
          <div className="size-10 rounded-xl bg-primary/10 grid place-items-center text-primary shrink-0">
            <Sparkles className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{t("settings.dataControl")}</p>
            <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
              {t("settings.dataControlDesc")}
            </p>
          </div>
        </section>

        {/* Setting groups */}
        {groups.map((group) => (
          <section key={group.label} className="space-y-2 animate-fade-up">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">
              {group.label}
            </h2>
            <div className="bg-card rounded-2xl outline-1 outline-black/5 dark:outline-white/10 overflow-hidden">
              {group.items.map((item, i) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-start gap-3 p-3.5 hover:bg-secondary/30 active:bg-secondary/50 transition ${
                      i < group.items.length - 1 ? "border-b border-border/30" : ""
                    }`}
                  >
                    <div
                      className={`size-9 rounded-xl grid place-items-center shrink-0 ${
                        item.tone === "primary"
                          ? "bg-primary/10 text-primary"
                          : "bg-secondary/40 text-foreground"
                      }`}
                    >
                      <Icon className="size-4" aria-hidden />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{item.title}</p>
                        {item.badge && (
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground shrink-0 mt-1" />
                  </Link>
                );
              })}
            </div>
          </section>
        ))}

        {/* Promo code redemption */}
        <RedeemPromoSection />

        {/* Quick info */}
        <section className="text-center pt-2 space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
            <Clock className="size-3" />
            <span>{t("settings.version")}</span>
          </div>
          <p className="text-[10px] text-muted-foreground/70">
            © 2026 HealthyU · Made with care in Indonesia 🇮🇩
          </p>
        </section>
      </div>
      <BottomNav />
    </main>
  );
}

// Keep unused imports referenced (intentional for future use)
void Languages;
void Globe;
void Ruler;

/**
 * RedeemPromoSection — small inline form on /pengaturan for users to
 * redeem admin-issued promo codes. Calls the redeem_promo SECURITY DEFINER
 * RPC via useRedeemPromo hook. Success/error surfaced via react-hot-toast.
 * ponytail: inline form on settings page; add a dedicated /promo route
 * if/when the redemption history view is requested (~25 lines of code).
 */
function RedeemPromoSection() {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const redeem = useRedeemPromo();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    redeem.mutate(
      { code: trimmed },
      {
        onSuccess: (res) => {
          if (res.success) {
            toast.success(t("promo.redeemOk"));
            setCode("");
          } else {
            toast.error(res.message || t("promo.redeemFail"));
          }
        },
        onError: (err: Error) => {
          toast.error(err.message || t("promo.redeemFail"));
        },
      },
    );
  };

  return (
    <section className="bg-card rounded-2xl outline-1 outline-black/5 dark:outline-white/10 p-4 space-y-3 animate-fade-up">
      <div className="flex items-center gap-2">
        <div className="size-8 rounded-xl bg-primary/10 grid place-items-center text-primary shrink-0">
          <Gift className="size-4" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{t("admin.promo.title")}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{t("admin.promo.subtitle")}</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder={t("promo.placeholder")}
          className="flex-1 min-w-0 bg-muted rounded-xl px-3 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          type="submit"
          disabled={redeem.isPending || !code.trim()}
          className="inline-flex items-center justify-center gap-1.5 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2.5 rounded-xl disabled:opacity-50 shrink-0"
        >
          {redeem.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Gift className="size-4" />
          )}
          {t("promo.redeemBtn")}
        </button>
      </form>
    </section>
  );
}
