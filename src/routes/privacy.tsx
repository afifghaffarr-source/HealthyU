import { createFileRoute, Link } from "@tanstack/react-router";
import { APP_CONFIG } from "@/config/app";
import { canonical, hreflangAlternates } from "@/lib/seo";
import { useTranslation } from "@/lib/i18n";
import { ShieldCheck, Download, Trash2, Eye, Edit3, Mail } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Kebijakan Privasi — HealthyU" },
      {
        name: "description",
        content:
          "Data apa saja yang kami kumpulkan, untuk apa, dan hak-hak Anda sebagai pengguna (UU PDP No. 27/2022).",
      },
      { property: "og:title", content: "Kebijakan Privasi — HealthyU" },
      {
        property: "og:description",
        content: "Hak-hak Anda sebagai pengguna HealthyU. Transparansi penuh.",
      },
      { property: "og:url", content: canonical("/privacy") },
    ],
    links: [{ rel: "canonical", href: canonical("/privacy") }, ...hreflangAlternates("/privacy")],
  }),
  component: PrivacyPage,
});

/**
 * UU PDP (Undang-Undang Pelindungan Data Pribadi) No. 27 Tahun 2022, Pasal 25
 * mengharuskan pengendali data untuk memberitahukan subjek data tentang:
 *   1. dasar pemrosesan,
 *   2. tujuan pemrosesan,
 *   3. jenis data pribadi yang diproses,
 *   4. cara penggunaan,
 *   5. periode retensi,
 *   6. hak-hak subjek data,
 *   7. kontak pengaduan.
 *
 * Halaman ini adalah disclosure publik. Tindakan (export, edit, hapus)
 * dilakukan di dalam aplikasi pada halaman /profile/privacy.
 */
function PrivacyPage() {
  const lastUpdated = "2026-06-17";
  const { t } = useTranslation();
  return (
    <main className="min-h-dvh bg-background">
      <article className="max-w-3xl mx-auto px-4 py-8 prose prose-sm prose-stone dark:prose-invert max-w-none">
        <header className="mb-6 not-prose">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary mb-4"
          >
            <ShieldCheck className="size-3" /> HealthyU
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">{t("privacyPolicy.title")}</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {t("privacyPolicy.lastUpdated", { date: lastUpdated })}
          </p>
        </header>

        <section>
          <h2>{t("privacyPolicy.summaryTitle")}</h2>
          <p>{t("privacyPolicy.summaryLead")}</p>
        </section>

        <section>
          <h2>{t("privacyPolicy.section1Title")}</h2>

          <h3>{t("privacyPolicy.section1UserTitle")}</h3>
          <ul>
            <li>{t("privacyPolicy.section1UserItems.akun")}</li>
            <li>{t("privacyPolicy.section1UserItems.profil")}</li>
            <li>{t("privacyPolicy.section1UserItems.log")}</li>
            <li>{t("privacyPolicy.section1UserItems.komunitas")}</li>
            <li>{t("privacyPolicy.section1UserItems.ai")}</li>
          </ul>

          <h3>{t("privacyPolicy.section1AutoTitle")}</h3>
          <ul>
            <li>{t("privacyPolicy.section1AutoItems.auth")}</li>
            <li>{t("privacyPolicy.section1AutoItems.notif")}</li>
            <li>{t("privacyPolicy.section1AutoItems.wearable")}</li>
            <li>{t("privacyPolicy.section1AutoItems.logs")}</li>
          </ul>
        </section>

        <section>
          <h2>{t("privacyPolicy.section2Title")}</h2>
          <ul>
            <li>{t("privacyPolicy.section2Item.summary")}</li>
            <li>{t("privacyPolicy.section2Item.recommend")}</li>
            <li>{t("privacyPolicy.section2Item.notif")}</li>
            <li>{t("privacyPolicy.section2Item.audit")}</li>
          </ul>
          <p>{t("privacyPolicy.section2NoTargeted")}</p>
        </section>

        <section>
          <h2>{t("privacyPolicy.section3Title")}</h2>
          <ul>
            <li>
              <strong>Penyedia infrastruktur</strong>: Supabase (penyimpanan database), Cloudflare
              (hosting & CDN). Keduanya terikat kontrak pemrosesan data.
            </li>
            <li>
              <strong>Penyedia AI</strong>: VexoAPI — menerima pesan Anda saat Anda chat dengan AI
              coach. Percakapan tidak dipakai untuk training model pihak ketiga.
            </li>
            <li>
              <strong>Pihak berwenang</strong>: hanya jika diwajibkan oleh hukum yang berlaku.
            </li>
          </ul>
        </section>

        <section>
          <h2>{t("privacyPolicy.section4Title")}</h2>
          <ul>
            <li>
              <strong>{t("privacyPolicy.section4ActiveAccount")}</strong>: data disimpan selama akun
              Anda aktif + 30 hari setelah proses penghapusan selesai (backup window).
            </li>
            <li>
              <strong>Percakapan AI</strong>: disimpan sampai Anda menghapusnya.
            </li>
            <li>
              <strong>Log audit</strong>: 365 hari untuk forensik & compliance.
            </li>
            <li>
              <strong>Log teknis</strong>: 30 hari.
            </li>
          </ul>
        </section>

        <section>
          <h2>{t("privacyPolicy.section5Title")}</h2>
          <p>{t("privacyPolicy.section5Intro")}</p>

          <div className="not-prose grid gap-3 sm:grid-cols-2 my-4">
            <RightCard
              icon={<Eye className="size-4" />}
              title={t("privacyPolicy.rightAccessTitle")}
              desc={t("privacyPolicy.rightAccessDesc")}
              action={{ to: "/profile/privacy", label: t("privacyPolicy.rightAccessAction") }}
            />
            <RightCard
              icon={<Download className="size-4" />}
              title={t("privacyPolicy.rightCopyTitle")}
              desc={t("privacyPolicy.rightCopyDesc")}
              action={{ to: "/backup", label: t("privacyPolicy.rightCopyAction") }}
            />
            <RightCard
              icon={<Edit3 className="size-4" />}
              title={t("privacyPolicy.rightFixTitle")}
              desc={t("privacyPolicy.rightFixDesc")}
              action={{ to: "/profile", label: t("privacyPolicy.rightFixAction") }}
            />
            <RightCard
              icon={<Trash2 className="size-4" />}
              title={t("privacyPolicy.rightDeleteTitle")}
              desc={t("privacyPolicy.rightDeleteDesc")}
              action={{ to: "/profile/privacy", label: t("privacyPolicy.rightDeleteAction") }}
            />
          </div>

          <p>{t("privacyPolicy.section5After")}</p>
        </section>

        <section>
          <h2>{t("privacyPolicy.section6Title")}</h2>
          <ul>
            <li>Enkripsi in-transit (HTTPS) & at-rest (Supabase default).</li>
            <li>
              Row-Level Security (RLS) di PostgreSQL — user hanya bisa membaca data miliknya
              sendiri.
            </li>
            <li>
              Token autentikasi tidak pernah di-log atau ditampilkan ke UI selain untuk debug
              teknis.
            </li>
          </ul>
        </section>

        <section>
          <h2>{t("privacyPolicy.section7Title")}</h2>
          <p>{t("privacyPolicy.section7Body")}</p>
        </section>

        <section>
          <h2>{t("privacyPolicy.section8Title")}</h2>
          <p>{t("privacyPolicy.section8Intro")}</p>
          <ul>
            <li>
              <Mail className="inline size-3.5 mr-1" />
              {t("privacyPolicy.section8EmailLabel")}{" "}
              <a href={`mailto:${APP_CONFIG.supportEmail}`}>{APP_CONFIG.supportEmail}</a>
            </li>
          </ul>
          <p>{t("privacyPolicy.section8After")}</p>
        </section>

        <section>
          <h2>{t("privacyPolicy.section9Title")}</h2>
          <p>{t("privacyPolicy.section9Body")}</p>
        </section>

        <footer className="mt-8 pt-4 border-t text-xs text-muted-foreground not-prose">
          <p>
            {t("privacyPolicy.footer")}{" "}
            <Link to="/auth" className="underline">
              masuk ke aplikasi
            </Link>
            .
          </p>
        </footer>
      </article>
    </main>
  );
}

function RightCard({
  icon,
  title,
  desc,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  action: { to: string; label: string };
}) {
  return (
    <div className="rounded-2xl bg-card border p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <span className="font-medium text-sm">{title}</span>
      </div>
      <p className="text-xs text-muted-foreground flex-1">{desc}</p>
      <Link to={action.to} className="text-xs font-medium text-primary hover:underline">
        {action.label} →
      </Link>
    </div>
  );
}
