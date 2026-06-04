import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { parseVoiceMeal } from "@/lib/scanPhoto.functions";
import { logMeal } from "@/lib/meals.functions";
import { Mic, MicOff, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/scan/voice")({
  component: VoicePage,
});

type Item = {
  name: string;
  portion_g?: number;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  confidence?: number;
};

type SR = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function VoicePage() {
  const [transcript, setTranscript] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recRef = useRef<SR | null>(null);

  const parse = useServerFn(parseVoiceMeal);
  const log = useServerFn(logMeal);

  const parseMut = useMutation({
    mutationFn: (t: string) => parse({ data: { transcript: t } }),
    onSuccess: (res) => {
      setItems(res.items as Item[]);
      if (!res.items?.length) toast.error("Tidak ada makanan dikenali");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const logMut = useMutation({
    mutationFn: async (it: Item) =>
      log({
        data: {
          food_item_id: null,
          custom_name: it.name,
          meal_type: "snack",
          serving_qty: 1,
          calories: Math.round(it.calories ?? 0),
          protein_g: Math.round(it.protein_g ?? 0),
          carbs_g: Math.round(it.carbs_g ?? 0),
          fat_g: Math.round(it.fat_g ?? 0),
        },
      }),
    onSuccess: (_r, it) => toast.success(`${it.name} dicatat`),
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    const W = window as unknown as {
      SpeechRecognition?: new () => SR;
      webkitSpeechRecognition?: new () => SR;
    };
    const Ctor = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!Ctor) {
      setSupported(false);
      return;
    }
    const r = new Ctor();
    r.continuous = false;
    r.interimResults = true;
    r.lang = "id-ID";
    r.onresult = (e) => {
      let final = "";
      for (let i = 0; i < e.results.length; i++) {
        final += e.results[i][0].transcript;
      }
      setTranscript(final);
    };
    r.onerror = (e) => {
      toast.error(`Mic error: ${e.error}`);
      setListening(false);
    };
    r.onend = () => setListening(false);
    recRef.current = r;
  }, []);

  function toggleMic() {
    if (!recRef.current) return;
    if (listening) {
      recRef.current.stop();
    } else {
      setTranscript("");
      setItems([]);
      try {
        recRef.current.start();
        setListening(true);
      } catch {
        toast.error("Tidak bisa mulai mic");
      }
    }
  }

  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Catat via Suara" showBack />
      <main className="max-w-md mx-auto px-4 pt-2 space-y-4">
        {!supported && (
          <div className="rounded-xl bg-destructive/10 text-destructive text-xs p-3">
            Browser tidak mendukung speech recognition. Coba Chrome/Edge.
          </div>
        )}
        <div className="rounded-3xl bg-card border p-6 text-center space-y-3">
          <button
            onClick={toggleMic}
            disabled={!supported}
            className={`size-20 mx-auto rounded-full grid place-items-center transition ${
              listening
                ? "bg-destructive text-destructive-foreground animate-pulse"
                : "bg-primary text-primary-foreground"
            }`}
          >
            {listening ? <MicOff className="size-8" /> : <Mic className="size-8" />}
          </button>
          <p className="text-xs text-muted-foreground">
            {listening ? "Mendengarkan… ucapkan apa yang Anda makan" : "Tekan untuk mulai bicara"}
          </p>
          <p className="text-[10px] text-muted-foreground">
            Contoh: "Saya makan nasi goreng setengah piring dan es teh manis"
          </p>
        </div>

        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Atau ketik manual…"
          className="w-full min-h-24 rounded-xl border bg-card p-3 text-sm outline-none focus:border-primary"
        />

        <button
          onClick={() => transcript.trim() && parseMut.mutate(transcript.trim())}
          disabled={!transcript.trim() || parseMut.isPending}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {parseMut.isPending && <Loader2 className="size-4 animate-spin" />}
          Analisa dengan AI
        </button>

        {items.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Terdeteksi</p>
            {items.map((it, i) => (
              <div key={i} className="p-3 rounded-2xl bg-card border flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{it.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {it.portion_g ? `~${it.portion_g}g · ` : ""}P {Math.round(it.protein_g ?? 0)}g ·
                    K {Math.round(it.carbs_g ?? 0)}g · L {Math.round(it.fat_g ?? 0)}g
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary text-sm">{Math.round(it.calories ?? 0)}</p>
                  <p className="text-[10px] text-muted-foreground">kkal</p>
                </div>
                <button
                  onClick={() => logMut.mutate(it)}
                  disabled={logMut.isPending}
                  className="size-9 rounded-xl bg-primary text-primary-foreground grid place-items-center disabled:opacity-50"
                  aria-label="Catat"
                >
                  <Check className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
