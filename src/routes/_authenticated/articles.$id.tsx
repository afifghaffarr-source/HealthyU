import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck, Share2 } from "lucide-react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";

export const Route = createFileRoute("/_authenticated/articles/$id")({
  component: ArticleReader,
});

function ArticleReader() {
  const { id } = Route.useParams();
  const storageKey = `hu_bookmark_${id}`;
  const [saved, setSaved] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setSaved(localStorage.getItem(storageKey) === "1");
  }, [storageKey]);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setProgress(max > 0 ? Math.min(100, (h.scrollTop / max) * 100) : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toggleSave = () => {
    const v = !saved;
    setSaved(v);
    localStorage.setItem(storageKey, v ? "1" : "0");
  };

  const share = async () => {
    const data = {
      title: `Artikel #${id}`,
      text: "Baca artikel sehat ini di HealthyU",
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(data);
      } catch {}
    } else {
      await navigator.clipboard.writeText(data.url);
    }
  };

  const minutes = 4;
  return (
    <div className="min-h-dvh pb-28 px-4">
      <div className="fixed top-0 inset-x-0 z-40 h-1 bg-transparent">
        <div
          className="h-full bg-gradient-to-r from-primary to-accent transition-[width]"
          style={{ width: `${progress}%` }}
        />
      </div>
      <TopAppBar
        title="Artikel"
        subtitle={`${minutes} menit baca`}
        showBack
        action={
          <div className="flex items-center gap-1">
            <button
              onClick={share}
              aria-label="Bagikan"
              className="inline-flex size-9 items-center justify-center rounded-full hover:bg-muted"
            >
              <Share2 className="size-5" />
            </button>
            <button
              onClick={toggleSave}
              aria-label={saved ? "Hapus bookmark" : "Simpan bookmark"}
              className="inline-flex size-9 items-center justify-center rounded-full hover:bg-muted"
            >
              {saved ? (
                <BookmarkCheck className="size-5 text-primary" />
              ) : (
                <Bookmark className="size-5" />
              )}
            </button>
          </div>
        }
      />
      <article className="prose prose-sm dark:prose-invert max-w-none mt-4">
        <h1 className="text-2xl font-bold mb-2">Artikel #{id}</h1>
        <p className="text-muted-foreground">
          Tips singkat menjaga pola hidup sehat: konsumsi sayur 5 porsi/hari, minum 8 gelas air,
          tidur 7-9 jam, dan aktivitas fisik minimal 30 menit/hari.
        </p>
        <h2 className="mt-4 text-lg font-bold">1. Pola makan</h2>
        <p className="text-muted-foreground">
          Pilih karbohidrat kompleks, protein tanpa lemak, dan sayur warna-warni.
        </p>
        <h2 className="mt-4 text-lg font-bold">2. Hidrasi</h2>
        <p className="text-muted-foreground">
          Minum sebelum lapar, hindari minuman manis berlebih.
        </p>
      </article>
      <BottomNav />
    </div>
  );
}
