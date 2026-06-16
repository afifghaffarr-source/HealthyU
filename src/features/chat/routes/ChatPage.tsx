import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
import { toast } from "@/lib/toast-config";
import { toastError } from "@/lib/toast-config";
import { useSpeech } from "@/features/chat/hooks/useSpeech";
import { Link } from "@tanstack/react-router";
import { ChatQuickActions } from "@/features/chat/components/ChatQuickActions";
import { ChatEmptyState, ChatMessages } from "@/features/chat/components/ChatMessages";
import { ChatComposer, type ImageData } from "@/features/chat/components/ChatComposer";
import { SafetyChip } from "@/components/healthyu/safety-chip";
import { CoachPromptChips } from "@/features/chat/components/CoachPromptChips";
import { ConfirmDialog } from "@/components/healthyu/confirm-dialog";
import { piiKinds, formatPiiKindsForDialog, type PiiKind } from "@/lib/pii";
import { auditPiiOnClient } from "@/features/chat/lib/piiAudit";

export function ChatPage() {
  const qc = useQueryClient();
  const fetchHist = useServerFn(getChatHistory);
  const clearFn = useServerFn(clearChatHistory);
  const reportFn = useServerFn(weeklyHealthReport);
  const { data: messages = [] } = useQuery({ queryKey: ["chat"], queryFn: () => fetchHist() });

  const [input, setInput] = useState("");
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [streaming, setStreaming] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const [dockHeight, setDockHeight] = useState(224);
  // AUDIT-017 Phase 2A: when PII is detected in a draft, freeze the
  // send and ask the user to confirm. Stash the pending payload so
  // the confirmation handler can submit it verbatim.
  const [piiWarning, setPiiWarning] = useState<{
    kinds: PiiKind[];
    message: string;
    imageBase64?: string;
    imageMime?: string;
  } | null>(null);
  const shellClassName = "mx-auto w-full max-w-md px-4 sm:px-5";
  const pageGutterClassName = "pb-6 lg:pb-8";

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

  // Shared send helper. Used by all 4 entry points (composer button,
  // quick actions, empty state chips, prompt chips) AND by voice
  // input's onFinal. Centralizes the PII check so no path bypasses
  // it.
  const sendMessage = (text: string, img?: ImageData | null) => {
    const msg = text.trim();
    if (!msg && !img) return;

    // PII check: only on the text portion. Image-only sends skip it.
    if (msg) {
      const kinds = piiKinds(msg);
      if (kinds.length > 0) {
        setPiiWarning({
          kinds,
          message: msg,
          imageBase64: img?.base64,
          imageMime: img?.mime,
        });
        return;
      }
    }

    setInput("");
    mutation.mutate({
      message: msg || "Tolong analisis foto ini.",
      imageBase64: img?.base64,
      imageMime: img?.mime,
    });
  };

  // User confirmed via the PII warning dialog. Submit the stashed
  // payload exactly as captured — the warning is a one-time consent,
  // we don't re-scan on submit (would be hostile UX).
  const confirmPiiSend = () => {
    if (!piiWarning) return;
    const { message, imageBase64, imageMime } = piiWarning;
    setPiiWarning(null);
    setInput("");
    // Audit-log the explicit consent (kinds only, no PII value).
    auditPiiOnClient(message);
    mutation.mutate({
      message,
      imageBase64,
      imageMime,
    });
  };

  const cancelPiiSend = () => setPiiWarning(null);

  // handleSend stays for back-compat with the JSX call sites
  // (onSend={() => handleSend()}). Quick actions and chips use
  // sendMessage(t, imageData) directly so they can pass the current
  // image attachment through.
  const handleSend = (text?: string) => sendMessage(text ?? input, imageData);

  const speech = useSpeech({
    onInterim: (t) => setInput(t),
    onFinal: (t) => {
      // Voice messages must go through the same PII check as typed
      // messages — don't call mutation.mutate directly here.
      sendMessage(t, null);
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
    onError: (e: Error) => toastError(e, "Gagal membuat laporan"),
  });

  const handleClear = () => {
    if (!messages.length || clearMut.isPending) return;
    if (typeof window !== "undefined" && !window.confirm("Hapus seluruh percakapan?")) return;
    clearMut.mutate();
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages, mutation.isPending, streaming]);

  useEffect(() => {
    if (messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.role !== "assistant") return;
    speech.speak(last.id, last.content);
  }, [messages, speech]);

  useLayoutEffect(() => {
    const updateDockHeight = () => {
      const next = dockRef.current?.offsetHeight ?? 0;
      setDockHeight(next > 0 ? next : 224);
    };

    updateDockHeight();
    const observer = new ResizeObserver(updateDockHeight);
    if (dockRef.current) observer.observe(dockRef.current);
    window.addEventListener("resize", updateDockHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateDockHeight);
    };
  }, [input, imageData, messages.length, mutation.isPending]);

  return (
    <main className="min-h-dvh bg-background">
      <div className={shellClassName}>
        <TopAppBar
          title="HealthyU AI Coach"
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
                {speech.ttsOn ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
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

      <div className={shellClassName} style={{ paddingBottom: `calc(${dockHeight}px + 2rem)` }}>
        <section className="overflow-hidden rounded-[1.6rem] border border-border/60 bg-background/70 px-2 py-2 shadow-sm backdrop-blur-sm supports-[backdrop-filter]:bg-background/60">
          <ChatQuickActions
            onPrompt={(t) => handleSend(t)}
            onReport={() => reportMut.mutate()}
            reportPending={reportMut.isPending}
            sendDisabled={mutation.isPending}
          />
        </section>
        {messages.length === 0 && !mutation.isPending && (
          <ChatEmptyState onPick={(t) => handleSend(t)} />
        )}
        <ChatMessages messages={messages} pending={mutation.isPending} streaming={streaming} />
        <div ref={endRef} className="h-1" aria-hidden="true" />
      </div>

      <div
        ref={dockRef}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border/50 bg-background/95 shadow-[0_-10px_30px_-24px_color-mix(in_oklab,var(--foreground)_24%,transparent)] backdrop-blur supports-[backdrop-filter]:bg-background/90 lg:left-64"
      >
        <div className={`${shellClassName} space-y-3 pt-3 ${pageGutterClassName}`}>
          {messages.length > 0 && (
            <section className="space-y-2 overflow-hidden rounded-[1.6rem] border border-border/60 bg-background/88 px-3 py-3 shadow-sm backdrop-blur-sm supports-[backdrop-filter]:bg-background/78">
              <div className="flex items-center justify-between gap-3 px-1">
                <div>
                  <p className="text-xs font-semibold text-foreground">Saran cepat</p>
                  <p className="text-[11px] text-muted-foreground">
                    Geser kartu atau pakai tombol panah
                  </p>
                </div>
              </div>
              <CoachPromptChips
                onPick={(t) => handleSend(t)}
                disabled={mutation.isPending}
                hour={new Date().getHours()}
              />
            </section>
          )}

          <div className="flex justify-center items-center gap-2">
            <SafetyChip variant="not-medical" className="shadow-none" />
            <Link
              to="/pengaturan/chat"
              className="text-[10px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
              aria-label="Pengaturan chat"
            >
              Pengaturan
            </Link>
          </div>

          <div className="rounded-[1.75rem] border border-border/60 bg-background/80 p-2 shadow-sm backdrop-blur-sm supports-[backdrop-filter]:bg-background/70">
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
          </div>
        </div>
      </div>

      <BottomNav />

      {piiWarning && (
        <ConfirmDialog
          open={true}
          title="Data sensitif terdeteksi"
          description={`Pesan ini mengandung ${formatPiiKindsForDialog(piiWarning.kinds)}. Data akan disimpan permanen di akun Anda. Kirim juga?`}
          confirmLabel="Kirim juga"
          cancelLabel="Sunting pesan"
          onConfirm={confirmPiiSend}
          onCancel={cancelPiiSend}
        />
      )}
    </main>
  );
}
