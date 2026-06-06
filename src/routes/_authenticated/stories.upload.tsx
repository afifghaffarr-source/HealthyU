import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { createStoryPhotoUploadUrl } from "@/features/scan/lib/scanBatch10.functions";
import { recordStoryPhoto } from "@/features/scan/lib/scanBatch9.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/stories/upload")({ component: Page });

function Page() {
  const signFn = useServerFn(createStoryPhotoUploadUrl);
  const recFn = useServerFn(recordStoryPhoto);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const mut = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Pilih foto");
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const { path, token } = await signFn({ data: { filename: safe } });
      const { error } = await supabase.storage
        .from("scan-photos")
        .uploadToSignedUrl(path, token, file);
      if (error) throw error;
      await recFn({ data: { storagePath: path, caption: caption || undefined } });
    },
    onSuccess: () => {
      toast.success("Story terunggah");
      setFile(null);
      setPreview(null);
      setCaption("");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const onPick = (f: File | null) => {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  };
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Upload Story" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          className="w-full text-sm"
        />
        {preview && (
          <img
            loading="lazy"
            decoding="async"
            src={preview}
            alt="preview"
            className="w-full rounded-xl"
          />
        )}
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Caption…"
          rows={2}
          className="w-full px-3 py-2 rounded-xl border bg-card"
        />
        <button
          onClick={() => mut.mutate()}
          disabled={!file || mut.isPending}
          className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 font-medium"
        >
          {mut.isPending ? "Mengunggah…" : "Upload"}
        </button>
      </main>
      <BottomNav />
    </div>
  );
}
