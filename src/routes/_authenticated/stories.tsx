import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { createMealStory, listStoriesFeed } from "@/lib/scanSocial.functions";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/stories")({
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const listFn = useServerFn(listStoriesFeed);
  const createFn = useServerFn(createMealStory);
  const [caption, setCaption] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["stories-feed"],
    queryFn: () => listFn({ data: undefined as never }),
  });
  const mut = useMutation({
    mutationFn: () => createFn({ data: { caption } }),
    onSuccess: () => {
      setCaption("");
      toast.success("Story diposting");
      qc.invalidateQueries({ queryKey: ["stories-feed"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Meal Stories" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-3">
        <div className="rounded-2xl bg-card border p-3 flex gap-2">
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Tulis story makanan hari ini…"
            className="flex-1 bg-transparent outline-none text-sm px-2"
            maxLength={280}
          />
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !caption.trim()}
            className="rounded-xl bg-primary text-primary-foreground px-3 py-2"
          >
            {mut.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
          </button>
        </div>
        {isLoading && <p className="text-sm text-muted-foreground">Memuat…</p>}
        {data?.stories?.map((s: any) => (
          <div key={s.id} className="rounded-2xl bg-card border p-3 space-y-1">
            <div className="text-xs text-muted-foreground">
              {s.profiles?.full_name ?? "User"} ·{" "}
              {new Date(s.created_at).toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            {s.image_url && <img loading="lazy" decoding="async" src={s.image_url} alt="" className="rounded-xl w-full" />}
            {s.caption && <p className="text-sm">{s.caption}</p>}
          </div>
        ))}
        {data && data.stories.length === 0 && (
          <p className="text-sm text-muted-foreground text-center pt-8">
            Belum ada story aktif. Follow teman untuk lihat feed mereka.
          </p>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
