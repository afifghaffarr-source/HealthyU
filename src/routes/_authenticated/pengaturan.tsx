import { createFileRoute, Link } from "@tanstack/react-router";
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
} from "lucide-react";

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
  const groups: { label: string; items: SettingItem[] }[] = [
    {
      label: "Akun",
      items: [
        {
          to: "/profile",
          icon: UserIcon,
          title: "Profil saya",
          description: "Nama, foto, biodata, target kesehatan",
        },
        {
          to: "/profile/privacy",
          icon: Lock,
          title: "Privasi & Data",
          description: "Audit, PII redaction, hapus akun",
        },
        {
          to: "/backup",
          icon: Download,
          title: "Backup & Ekspor",
          description: "Unduh data pribadi (JSON/CSV)",
          tone: "primary",
        },
      ],
    },
    {
      label: "Pengalaman",
      items: [
        {
          to: "/pengaturan/preferensi",
          icon: Palette,
          title: "Preferensi",
          description: "Unit, bahasa, tema, timezone",
          tone: "primary",
        },
        {
          to: "/notifications",
          icon: Bell,
          title: "Notifikasi",
          description: "Push, pengingat sahur/buka, dsb",
        },
        {
          to: "/pengaturan/chat",
          icon: MessageCircle,
          title: "Pengaturan Chat",
          description: "Retensi pesan, audit chat",
        },
        {
          to: "/profile/pattern-settings",
          icon: Brain,
          title: "Deteksi Pola",
          description: "Sensitivitas & threshold pola makan",
        },
      ],
    },
    {
      label: "Tentang",
      items: [
        {
          to: "/privacy",
          icon: Info,
          title: "Kebijakan Privasi",
          description: "UU PDP No. 27/2022",
        },
        {
          to: "/faq",
          icon: HelpCircle,
          title: "FAQ",
          description: "Pertanyaan yang sering ditanya",
        },
      ],
    },
  ];

  return (
    <main className="min-h-dvh bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-2 space-y-5">
        <TopAppBar title="Pengaturan" subtitle="Atur akun, privasi, & preferensi" showBack />

        {/* Hero / status banner */}
        <section className="bg-gradient-to-br from-sage/10 to-primary/5 p-4 rounded-2xl outline-1 outline-primary/20 flex items-center gap-3 animate-fade-up">
          <div className="size-10 rounded-xl bg-primary/10 grid place-items-center text-primary shrink-0">
            <Sparkles className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Data Anda, kendali Anda</p>
            <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
              Atur privasi, backup data, atau hapus akun kapan saja. Sesuai UU PDP.
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

        {/* Quick info */}
        <section className="text-center pt-2 space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
            <Clock className="size-3" />
            <span>HealthyU v1.0</span>
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
