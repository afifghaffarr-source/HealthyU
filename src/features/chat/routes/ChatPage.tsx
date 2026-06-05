import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getChatHistory,
  clearChatHistory,
  weeklyHealthReport,
} from "@/features/chat/lib/chat.functions";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/bottom-nav";
import { Trash2, Volume2, VolumeX } from "lucide-react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { toast } from "sonner";
import { toastError } from "@/lib/toast-config";
import { useSpeech } from "@/features/chat/hooks/useSpeech";
import { ChatQuickActions } from "@/features/chat/components/ChatQuickActions";
import { ChatEmptyState, ChatMessages } from "@/features/chat/components/ChatMessages";
import { ChatComposer, type ImageData } from "@/features/chat/components/ChatComposer";
import { SafetyChip } from "@/components/healthyu/safety-chip";
import { CoachPromptChips } from "@/features/chat/components/CoachPromptChips";

export function ChatPage() {
  const qc = useQueryClient();
  const fetchHist = useServerFn(getChatHistory);
  const clearFn = useServerFn(clearChatHistory);
  const reportFn = useServerFn(weeklyHealthReport);
  const { data: messages = [] } = useQuery({ queryKey: ["chat"], queryFn: () => fetchHist() });

  const [input, setInput] = useState("");
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [streaming, setStreaming] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const mutation = useMutation({
    mutationFn: async (payload: { message: string; imageBase64?: string; imageMime?: string }) => {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Sesi habis, silakan login ulang");
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok || !res.body) {
        if (res.status === 429) throw new Error("Terlalu banyak permintaan. Coba lagi sebentar.");
        if (res.status === 402) throw new Error("Kredit AI habis.");
        throw new Error(`Gagal kirim (${res.status})`);
      }
      // Refresh history so user message appears immediately
      qc.invalidateQueries({ queryKey: ["chat"] });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
      setStreaming("");
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const events = buf.split("\n\n");
        buf = events.pop() ?? "";
        for (const evt of events) {
          const dataLine = evt.split("\n").find((l) => l.startsWith("data:"));
          if (!dataLine) continue;
          try {
            const json = JSON.parse(dataLine.slice(5).trim());
            if (typeof json.delta === "string") {
              acc += json.delta;
              setStreaming(acc);
            }
          } catch {
            /* ignore */
          }
        }
      }
      return acc;
    },
    onSuccess: () => {
      setImageData(null);
      setStreaming(null);
      qc.invalidateQueries({ queryKey: ["chat"] });
    },
    onError: (e) => {
      setStreaming(null);
      toastError(e, "Gagal kirim");
    },
  });

  const handleSend = (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg && !imageData) return;
    setInput("");
    mutation.mutate({
      message: msg || "Tolong analisis foto ini.",
      imageBase64: imageData?.base64,
      imageMime: imageData?.mime,
    });
  };

  const speech = useSpeech({
    onInterim: (t) => setInput(t),
    onFinal: (t) => {
      setInput("");
      mutation.mutate({ message: t });
    },
  });

  const clearMut = useMutation({
    mutationFn: () => clearFn(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat"] });
      speech.cancelSpeak();
      toast.success("Riwayat dihapus");
    },
  });

  const reportMut = useMutation({
    mutationFn: () => reportFn(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const handleClear = () => {
    if (!messages.length || clearMut.isPending) return;
    if (typeof window !== "undefined" && !window.confirm("Hapus seluruh percakapan?")) return;
    clearMut.mutate();
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, mutation.isPending, streaming]);

  useEffect(() => {
    if (messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.role !== "assistant") return;
    speech.speak(last.id, last.content);
  }, [messages, speech]);

  return (
    <main className="min-h-dvh bg-background flex flex-col">
      <div className="max-w-md w-full mx-auto px-5 pt-0">
        <TopAppBar
          title="Dr. Healthy"
          subtitle="AI nutrition coach"
          showBack
          action={
            <div className="flex items-center gap-1.5">
              <button
                onClick={speech.toggleTts}
                className={`size-9 rounded-full grid place-items-center transition ${
                  speech.ttsOn
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
                aria-label="Toggle suara balasan"
              >
                {speech.ttsOn ? (
                  <Volume2 className="size-4" />
                ) : (
                  <VolumeX className="size-4" />
                )}
              </button>
              <button
                onClick={handleClear}
                disabled={!messages.length || clearMut.isPending}
                className="size-9 rounded-full grid place-items-center bg-muted text-muted-foreground hover:text-destructive disabled:opacity-40"
                aria-label="Hapus percakapan"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          }
        />
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto max-w-md w-full mx-auto px-5 pb-40">
        <ChatQuickActions
          onPrompt={(t) => handleSend(t)}
          onReport={() => reportMut.mutate()}
          reportPending={reportMut.isPending}
          sendDisabled={mutation.isPending}
        />
        {messages.length === 0 && !mutation.isPending && (
          <ChatEmptyState onPick={(t) => handleSend(t)} />
        )}
        <ChatMessages
          messages={messages}
          pending={mutation.isPending}
          streaming={streaming}
        />
      </div>

      <ChatComposer
        input={input}
        setInput={setInput}
        imageData={imageData}
        setImageData={setImageData}
        onSend={() => handleSend()}
        pending={mutation.isPending}
        listening={speech.listening}
        onToggleMic={speech.toggleMic}
      />

      <div className="fixed bottom-[5.25rem] inset-x-0 z-10 px-3 pointer-events-none">
        <div className="max-w-md mx-auto space-y-2">
          {messages.length > 0 && (
            <div className="pointer-events-auto">
              <CoachPromptChips
                onPick={(t) => handleSend(t)}
                disabled={mutation.isPending}
                hour={new Date().getHours()}
              />
            </div>
          )}
          <div className="flex justify-center">
            <SafetyChip variant="not-medical" className="shadow-sm pointer-events-auto" />
          </div>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
