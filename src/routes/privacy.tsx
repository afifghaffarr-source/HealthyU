import { createFileRoute, Link } from "@tanstack/react-router";
import { APP_CONFIG } from "@/config/app";
import { canonical, hreflangAlternates } from "@/lib/seo";
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
          <h1 className="text-3xl font-bold tracking-tight">Kebijakan Privasi</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Terakhir diperbarui: {lastUpdated} · Merujuk pada UU PDP No. 27/2022
          </p>
        </header>

        <section>
          <h2>Ringkasan singkat</h2>
          <p>
            HealthyU adalah aplikasi catatan kesehatan pribadi. Kami hanya mengumpulkan data yang
            Anda berikan secara sadar (profil, log makanan, olahraga, tidur, dll) untuk menampilkan
            kembali informasi tersebut kepada Anda. Kami <strong>tidak menjual data Anda</strong> ke
            pihak ketiga.
          </p>
        </section>

        <section>
          <h2>1. Data yang kami kumpulkan</h2>

          <h3>Data yang Anda berikan</h3>
          <ul>
            <li>
              <strong>Akun</strong>: email, nama tampilan, foto profil (jika diunggah), preferensi
              publik (mis. profil publik/privat).
            </li>
            <li>
              <strong>Profil kesehatan</strong>: tanggal lahir, jenis kelamin, tinggi, berat,
              alergi, kondisi kesehatan yang Anda catat sendiri.
            </li>
            <li>
              <strong>Log aktivitas</strong>: makanan, minuman, olahraga, tidur, berat, mood, obat,
              catatan, foto progres.
            </li>
            <li>
              <strong>Konten komunitas</strong>: posting, komentar, dan interaksi (like, simpan)
              yang Anda buat di fitur komunitas.
            </li>
            <li>
              <strong>Percakapan AI</strong>: pesan yang Anda kirim ke AI coach.
            </li>
          </ul>

          <h3>Data yang dikumpulkan otomatis</h3>
          <ul>
            <li>
              <strong>Autentikasi</strong>: token sesi, refresh token (Supabase Auth).
            </li>
            <li>
              <strong>Notifikasi</strong>: endpoint push subscription (VAPID) untuk kirim pengingat.
            </li>
            <li>
              <strong>Wearable</strong> (opsional): token koneksi ke Google Fit, jika Anda
              menghubungkan perangkat.
            </li>
            <li>
              <strong>Log teknis</strong>: error report anonim, metrik performa (tanpa PII).
            </li>
          </ul>
        </section>

        <section>
          <h2>2. Untuk apa data digunakan</h2>
          <ul>
            <li>Menampilkan kembali ringkasan, grafik, dan tren kesehatan Anda.</li>
            <li>Mengirimkan rekomendasi personal (AI coach, rekomendasi olahraga, dll).</li>
            <li>Mengirim notifikasi yang Anda daftarkan (pengingat minum, jadwal puasa, dst).</li>
            <li>
              Audit kualitas model AI — <strong>hanya</strong> jika Anda mengaktifkan toggle "Bantu
              tingkatkan AI" di halaman privasi.
            </li>
          </ul>
          <p>Kami tidak menggunakan data Anda untuk iklan bertarget atau dibagikan ke pengiklan.</p>
        </section>

        <section>
          <h2>3. Siapa yang menerima data</h2>
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
          <h2>4. Periode retensi</h2>
          <ul>
            <li>
              <strong>Akun aktif</strong>: data disimpan selama akun Anda aktif + 30 hari setelah
              proses penghapusan selesai (backup window).
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
          <h2>5. Hak-hak Anda (UU PDP Pasal 5-12)</h2>
          <p>Anda berhak untuk:</p>

          <div className="not-prose grid gap-3 sm:grid-cols-2 my-4">
            <RightCard
              icon={<Eye className="size-4" />}
              title="Melihat & mengakses"
              desc="Lihat semua data pribadi Anda yang kami simpan."
              action={{ to: "/profile/privacy", label: "Privasi saya" }}
            />
            <RightCard
              icon={<Download className="size-4" />}
              title="Mendapatkan salinan"
              desc="Ekspor seluruh data Anda dalam format JSON atau CSV."
              action={{ to: "/backup", label: "Unduh data" }}
            />
            <RightCard
              icon={<Edit3 className="size-4" />}
              title="Memperbaiki"
              desc="Perbarui data yang tidak akurat di halaman profil."
              action={{ to: "/profile", label: "Edit profil" }}
            />
            <RightCard
              icon={<Trash2 className="size-4" />}
              title="Menghapus akun"
              desc="Hapus permanen akun & semua data Anda."
              action={{ to: "/profile/privacy", label: "Hapus akun" }}
            />
          </div>

          <p>
            Setiap permintaan dieksekusi maksimal <strong>7×24 jam</strong> setelah permintaan
            diverifikasi. Permintaan yang terkait kewajiban hukum (mis. log audit yang sudah
            kadaluarsa) akan dijelaskan alasannya.
          </p>
        </section>

        <section>
          <h2>6. Keamanan</h2>
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
          <h2>7. Anak di bawah umur</h2>
          <p>
            HealthyU tidak ditujukan untuk anak di bawah 13 tahun. Kami tidak dengan sengaja
            mengumpulkan data anak di bawah batas usia tersebut. Orang tua/wali yang khawatir dapat
            menghubungi kami untuk meminta penghapusan data.
          </p>
        </section>

        <section>
          <h2>8. Kontak & pengaduan</h2>
          <p>Untuk pertanyaan, permintaan akses data, atau pengaduan privasi:</p>
          <ul>
            <li>
              <Mail className="inline size-3.5 mr-1" />
              Email: <a href={`mailto:${APP_CONFIG.supportEmail}`}>{APP_CONFIG.supportEmail}</a>
            </li>
          </ul>
          <p>
            Jika Anda merasa keluhan tidak ditangani dengan baik, Anda berhak mengajukan pengaduan
            ke otoritas perlindungan data pribadi Indonesia (kominfo).
          </p>
        </section>

        <section>
          <h2>9. Perubahan kebijakan</h2>
          <p>
            Kami akan memberi tahu Anda melalui notifikasi aplikasi jika ada perubahan material pada
            kebijakan ini. Versi sebelumnya akan tetap tersedia di histori publik halaman ini.
          </p>
        </section>

        <footer className="mt-8 pt-4 border-t text-xs text-muted-foreground not-prose">
          <p>
            Halaman ini bersifat publik. Untuk tindakan (lihat, unduh, edit, hapus data) silakan{" "}
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
