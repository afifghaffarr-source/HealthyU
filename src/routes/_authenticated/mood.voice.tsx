import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { transcribeVoice } from "@/features/scan/lib/scanBatch10.functions";
import { Mic, Square } from "lucide-react";
import { toast } from "@/lib/toast-config";

export const Route = createFileRoute("/_authenticated/mood/voice")({ component: Page });

function Page() {
  const fn = useServerFn(transcribeVoice);
  const [rec, setRec] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mut = useMutation({
    mutationFn: (b64: string) =>
      fn({ data: { audioBase64: b64, mimeType: "audio/webm", source: "mood" } }),
    onSuccess: () => toast.success("Transkripsi selesai"),
    onError: (e: Error) => toast.error(e.message),
  });
  const start = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream);
    chunksRef.current = [];
    mr.ondataavailable = (e) => chunksRef.current.push(e.data);
    mr.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const buf = await blob.arrayBuffer();
      const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      mut.mutate(b64);
      stream.getTracks().forEach((t) => t.stop());
    };
    mr.start();
    recRef.current = mr;
    setRec(true);
  };
  const stop = () => {
    recRef.current?.stop();
    setRec(false);
  };
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Mood Voice" showBack />
      <main className="max-w-md mx-auto px-4 pt-8 space-y-6 text-center">
        <button
          onClick={rec ? stop : start}
          className={`size-32 mx-auto rounded-full inline-flex items-center justify-center ${rec ? "bg-red-500" : "bg-primary"} text-white`}
        >
          {rec ? <Square className="size-12" /> : <Mic className="size-12" />}
        </button>
        <p className="text-sm text-muted-foreground">
          {rec ? "Merekam… tap untuk berhenti" : "Tap untuk mulai rekam"}
        </p>
        {mut.data && (
          <div className="rounded-2xl bg-card border p-4 text-left text-sm">
            <b>Transkrip:</b>
            <p className="mt-1">{(mut.data as { transcript: string }).transcript}</p>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
