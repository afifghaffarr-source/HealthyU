import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { generateWeeklyPodcast } from "@/lib/scanBatch12.functions";

export const Route = createFileRoute("/_authenticated/podcast/weekly")({ component: Page });

function Page() {
  const fn = useServerFn(generateWeeklyPodcast);
  const mut = useMutation({ mutationFn: () => fn({ data: undefined as never }) });
  const play = () => {
    if (!mut.data?.script) return;
    const u = new SpeechSynthesisUtterance(mut.data.script);
    u.lang = "id-ID";
    window.speechSynthesis.speak(u);
  };
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Podcast Mingguan" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-3">
        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending}
          className="w-full rounded-lg bg-primary text-primary-foreground py-2 text-sm"
        >
          {mut.isPending ? "Membuat..." : "Generate Skrip"}
        </button>
        {mut.data?.script && (
          <>
            <div className="rounded-xl border bg-card p-3 text-sm whitespace-pre-wrap">
              {mut.data.script}
            </div>
            <button onClick={play} className="w-full rounded-lg border py-2 text-sm">
              ▶ Putar Audio (TTS)
            </button>
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
