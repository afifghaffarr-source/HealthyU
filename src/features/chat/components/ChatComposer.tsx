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
        <div className="flex items-center gap-2 rounded-[1.35rem] border border-border/60 bg-card px-3 py-2 shadow-sm">
          <img
            src={imageData.preview}
            alt="preview"
            className="size-12 rounded-xl object-cover"
          />
          <span className="min-w-0 flex-1 text-xs text-muted-foreground">Foto siap dikirim</span>
          <button
            type="button"
            onClick={() => setImageData(null)}
            className="size-7 grid place-items-center rounded-lg hover:bg-secondary/50"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}
      <div className="flex min-w-0 items-end gap-2 rounded-[1.75rem] border border-border/60 bg-card px-2 py-2 shadow-sm">
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
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={pending}
          className="size-10 grid place-items-center rounded-2xl text-muted-foreground hover:bg-secondary/50 disabled:opacity-40"
          aria-label="Lampirkan foto"
        >
          <ImagePlus className="size-4" />
        </button>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder={
            listening
              ? "Mendengarkan..."
              : imageData
                ? "Tambah pertanyaan (opsional)..."
                : "Tanya HealthyU AI Coach..."
          }
          disabled={pending}
          rows={1}
          className="max-h-32 min-h-[2.75rem] min-w-0 flex-1 resize-none bg-transparent px-2 py-2.5 text-sm leading-5 text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
        />
        <button
          type="button"
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
          type="button"
          onClick={onSend}
          disabled={pending || (!input.trim() && !imageData)}
          className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </div>
    </div>
  );
}