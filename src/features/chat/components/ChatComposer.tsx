import { useRef } from "react";
import { ImagePlus, Mic, MicOff, Send, X } from "lucide-react";
import { toast } from "sonner";

export type ImageData = { base64: string; mime: string; preview: string };

export function ChatComposer({
  input,
  setInput,
  imageData,
  setImageData,
  onSend,
  pending,
  listening,
  onToggleMic,
}: {
  input: string;
  setInput: (v: string) => void;
  imageData: ImageData | null;
  setImageData: (v: ImageData | null) => void;
  onSend: () => void;
  pending: boolean;
  listening: boolean;
  onToggleMic: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

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
    <div className="space-y-2">
      {imageData && (
        <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-card px-3 py-2">
          <img
            src={imageData.preview}
            alt="preview"
            className="size-12 rounded-xl object-cover"
          />
          <span className="text-xs text-muted-foreground flex-1">Foto siap dikirim</span>
          <button
            onClick={() => setImageData(null)}
            className="size-7 grid place-items-center rounded-lg hover:bg-secondary/50"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}
      <div className="flex items-center gap-2 rounded-[1.75rem] border border-border/60 bg-card px-2 py-2">
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
          disabled={pending}
          className="size-10 grid place-items-center rounded-2xl text-muted-foreground hover:bg-secondary/50 disabled:opacity-40"
          aria-label="Lampirkan foto"
        >
          <ImagePlus className="size-4" />
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSend()}
          placeholder={
            listening
              ? "Mendengarkan..."
              : imageData
                ? "Tambah pertanyaan (opsional)..."
                : "Tanya HealthyU AI Coach..."
          }
          disabled={pending}
          className="flex-1 bg-transparent px-3 py-2.5 text-sm focus:outline-none disabled:opacity-50"
        />
        <button
          onClick={onToggleMic}
          disabled={pending}
          className={`size-10 grid place-items-center rounded-2xl transition disabled:opacity-40 ${
            listening
              ? "bg-destructive text-destructive-foreground animate-pulse"
              : "text-muted-foreground hover:bg-secondary/50"
          }`}
          aria-label="Voice input"
        >
          {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
        </button>
        <button
          onClick={onSend}
          disabled={pending || (!input.trim() && !imageData)}
          className="size-10 bg-primary text-primary-foreground rounded-2xl grid place-items-center disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </div>
    </div>
  );
}