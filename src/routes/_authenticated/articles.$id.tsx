import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";

export const Route = createFileRoute("/_authenticated/articles/$id")({
  component: ArticleReader,
});

function ArticleReader() {
  const { id } = Route.useParams();
  const [saved, setSaved] = useState(false);
  const minutes = 4;
  return (
    <div className="min-h-screen pb-28 px-4">
      <TopAppBar
        title="Artikel"
        subtitle={`${minutes} menit baca`}
        showBack
        action={
          <button
            onClick={() => setSaved((v) => !v)}
            aria-label={saved ? "Hapus bookmark" : "Simpan bookmark"}
            className="inline-flex size-9 items-center justify-center rounded-full hover:bg-muted"
          >
            {saved ? <BookmarkCheck className="size-5 text-primary" /> : <Bookmark className="size-5" />}
          </button>
        }
      />
      <article className="prose prose-sm dark:prose-invert max-w-none mt-4">
        <h1 className="text-2xl font-bold mb-2">Artikel #{id}</h1>
        <p className="text-muted-foreground">
          Tips singkat menjaga pola hidup sehat: konsumsi sayur 5 porsi/hari, minum 8 gelas air,
          tidur 7-9 jam, dan aktivitas fisik minimal 30 menit/hari.
        </p>
        <h2 className="mt-4 text-lg font-bold">1. Pola makan</h2>
        <p className="text-muted-foreground">Pilih karbohidrat kompleks, protein tanpa lemak, dan sayur warna-warni.</p>
        <h2 className="mt-4 text-lg font-bold">2. Hidrasi</h2>
        <p className="text-muted-foreground">Minum sebelum lapar, hindari minuman manis berlebih.</p>
      </article>
      <BottomNav />
    </div>
  );
}