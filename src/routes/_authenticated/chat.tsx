import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getChatHistory, sendChatMessage, clearChatHistory } from "@/lib/chat.functions";
import { BottomNav } from "@/components/bottom-nav";
import { ArrowLeft, Send, Sparkles, ImagePlus, X, Mic, MicOff, Volume2, VolumeX, Utensils, Timer, Flame, ChefHat, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/chat")({
  component: ChatPage,
});

const SUGGESTIONS = [
  "Berapa kalori nasi goreng?",
  "Rekomendasi sarapan rendah karbo",
  "Apakah puasa 16:8 cocok untuk saya?",
  "Sahur sehat untuk Ramadhan",
];

const QUICK_ACTIONS = [
  { label: "Log makanan", icon: Utensils, to: "/food" as const },
  { label: "Rekomendasi AI", icon: ChefHat, to: "/recommendations" as const },
  { label: "Mulai puasa", icon: Timer, to: "/fasting" as const },
  { label: "Budget kalori", icon: Flame, prompt: "Berapa sisa budget kalori saya hari ini? Berikan rekomendasi makanan." },
];

function ChatPage() {
  const qc = useQueryClient();
  const fetchHist = useServerFn(getChatHistory);
  const send = useServerFn(sendChatMessage);
  const clearFn = useServerFn(clearChatHistory);
  const { data: messages = [] } = useQuery({ queryKey: ["chat"], queryFn: () => fetchHist() });

  const [input, setInput] = useState("");
  const [imageData, setImageData] = useState<{ base64: string; mime: string; preview: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [listening, setListening] = useState(false);
  const [ttsOn, setTtsOn] = useState(false);
  const recogRef = useRef<any>(null);
  const lastSpokenRef = useRef<string | null>(null);
  const sttSupported = typeof window !== "undefined" && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  const ttsSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  const mutation = useMutation({
    mutationFn: (payload: { message: string; imageBase64?: string; imageMime?: string }) =>
      send({ data: payload }),
    onSuccess: () => {
      setImageData(null);
      qc.invalidateQueries({ queryKey: ["chat"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal kirim"),
  });

  const clearMut = useMutation({
    mutationFn: () => clearFn(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat"] });
      try { window.speechSynthesis?.cancel(); } catch {}
      lastSpokenRef.current = null;
      toast.success("Riwayat dihapus");
    },
  });

  const handleClear = () => {
    if (!messages.length || clearMut.isPending) return;
    if (typeof window !== "undefined" && !window.confirm("Hapus seluruh percakapan?")) return;
    clearMut.mutate();
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, mutation.isPending]);

  // Auto-speak latest assistant reply when TTS is on
  useEffect(() => {
    if (!ttsOn || !ttsSupported || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.role !== "assistant") return;
    if (lastSpokenRef.current === last.id) return;
    lastSpokenRef.current = last.id;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(last.content.replace(/[*_#`>]/g, ""));
      u.lang = "id-ID";
      u.rate = 1;
      window.speechSynthesis.speak(u);
    } catch {}
  }, [messages, ttsOn, ttsSupported]);

  useEffect(() => {
    return () => {
      try { window.speechSynthesis?.cancel(); } catch {}
      try { recogRef.current?.stop?.(); } catch {}
    };
  }, []);

  const toggleTts = () => {
    if (!ttsSupported) {
      toast.error("Browser tidak mendukung text-to-speech");
      return;
    }
    setTtsOn((v) => {
      if (v) {
        try { window.speechSynthesis.cancel(); } catch {}
      }
      return !v;
    });
  };

  const toggleMic = () => {
    if (!sttSupported) {
      toast.error("Browser tidak mendukung voice input");
      return;
    }
    if (listening) {
      try { recogRef.current?.stop?.(); } catch {}
      return;
    }
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const r = new SR();
    r.lang = "id-ID";
    r.interimResults = true;
    r.continuous = false;
    let finalText = "";
    r.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t;
        else interim += t;
      }
      setInput((finalText + interim).trim());
    };
    r.onerror = (e: any) => {
      toast.error(`Voice error: ${e.error ?? "unknown"}`);
      setListening(false);
    };
    r.onend = () => {
      setListening(false);
      const txt = finalText.trim();
      if (txt) {
        setInput("");
        mutation.mutate({ message: txt });
      }
    };
    recogRef.current = r;
    setListening(true);
    try { r.start(); } catch { setListening(false); }
  };

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

  const handleFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran foto maks 5MB");
      return;
    }
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const base64 = btoa(binary);
    setImageData({ base64, mime: file.type || "image/jpeg", preview: URL.createObjectURL(file) });
  };

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <header className="max-w-md w-full mx-auto px-5 pt-8 pb-4 flex items-center gap-3">
        <Link to="/dashboard" className="size-10 bg-card rounded-2xl outline-1 outline-black/10 grid place-items-center">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-primary" />
            <h1 className="text-lg font-bold">Dr. Healthy</h1>
          </div>
          <p className="text-[11px] text-muted-foreground">AI nutrition coach</p>
        </div>
        <button
          onClick={toggleTts}
          className={`ml-auto size-10 rounded-2xl grid place-items-center outline-1 outline-black/10 transition ${
            ttsOn ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
          }`}
          aria-label="Toggle suara balasan"
        >
          {ttsOn ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
        </button>
        <button
          onClick={handleClear}
          disabled={!messages.length || clearMut.isPending}
          className="size-10 rounded-2xl grid place-items-center bg-card outline-1 outline-black/10 text-muted-foreground hover:text-destructive disabled:opacity-40"
          aria-label="Hapus percakapan"
        >
          <Trash2 className="size-4" />
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto max-w-md w-full mx-auto px-5 pb-40">
        <div className="flex gap-2 overflow-x-auto pt-2 -mx-1 px-1 pb-1 no-scrollbar">
          {QUICK_ACTIONS.map((a) => {
            const Icon = a.icon;
            const content = (
              <span className="flex items-center gap-1.5 bg-card outline-1 outline-black/10 px-3 py-2 rounded-2xl text-xs font-medium whitespace-nowrap hover:bg-secondary/40 transition">
                <Icon className="size-3.5 text-primary" />
                {a.label}
              </span>
            );
            return "to" in a ? (
              <Link key={a.label} to={a.to}>{content}</Link>
            ) : (
              <button key={a.label} onClick={() => handleSend(a.prompt)} disabled={mutation.isPending}>
                {content}
              </button>
            );
          })}
        </div>
        {messages.length === 0 && !mutation.isPending && (
          <div className="py-8 space-y-4 animate-fade-up">
            <div className="bg-card p-5 rounded-3xl outline-1 outline-black/5">
              <p className="font-bold mb-1">Selamat datang! 👋</p>
              <p className="text-sm text-muted-foreground">Saya Dr. Healthy. Tanyakan apa saja seputar nutrisi, diet, puasa, atau gaya hidup sehat.</p>
            </div>
            <div className="space-y-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="w-full text-left bg-card p-3 rounded-2xl outline-1 outline-black/5 text-sm hover:bg-secondary/40 transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3 py-4">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] px-4 py-3 rounded-3xl text-sm whitespace-pre-wrap leading-relaxed ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-card outline-1 outline-black/5 rounded-bl-md"
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          {mutation.isPending && (
            <div className="flex justify-start">
              <div className="bg-card outline-1 outline-black/5 px-4 py-3 rounded-3xl rounded-bl-md">
                <div className="flex gap-1">
                  <span className="size-1.5 bg-primary rounded-full animate-pulse" />
                  <span className="size-1.5 bg-primary rounded-full animate-pulse [animation-delay:0.2s]" />
                  <span className="size-1.5 bg-primary rounded-full animate-pulse [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-24 left-0 right-0 z-30">
        <div className="max-w-md mx-auto px-4">
          {imageData && (
            <div className="mb-2 bg-card rounded-2xl outline-1 outline-black/10 p-2 flex items-center gap-2 shadow-lg">
              <img src={imageData.preview} alt="preview" className="size-12 rounded-xl object-cover" />
              <span className="text-xs text-muted-foreground flex-1">Foto siap dikirim</span>
              <button
                onClick={() => setImageData(null)}
                className="size-7 grid place-items-center rounded-lg hover:bg-secondary/50"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}
          <div className="bg-card rounded-3xl outline-1 outline-black/10 shadow-lg p-2 flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={mutation.isPending}
              className="size-10 grid place-items-center rounded-2xl text-muted-foreground hover:bg-secondary/50 disabled:opacity-40"
              aria-label="Lampirkan foto"
            >
              <ImagePlus className="size-4" />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={listening ? "Mendengarkan..." : imageData ? "Tambah pertanyaan (opsional)..." : "Tanya Dr. Healthy..."}
              disabled={mutation.isPending}
              className="flex-1 bg-transparent px-3 py-2 text-sm focus:outline-none disabled:opacity-50"
            />
            <button
              onClick={toggleMic}
              disabled={mutation.isPending}
              className={`size-10 grid place-items-center rounded-2xl transition disabled:opacity-40 ${
                listening ? "bg-destructive text-destructive-foreground animate-pulse" : "text-muted-foreground hover:bg-secondary/50"
              }`}
              aria-label="Voice input"
            >
              {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
            </button>
            <button
              onClick={() => handleSend()}
              disabled={mutation.isPending || (!input.trim() && !imageData)}
              className="size-10 bg-primary text-primary-foreground rounded-2xl grid place-items-center disabled:opacity-40"
            >
              <Send className="size-4" />
            </button>
          </div>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}