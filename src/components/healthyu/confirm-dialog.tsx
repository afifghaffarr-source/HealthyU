import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Konfirmasi",
  cancelLabel = "Batal",
  destructive,
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      className="fixed inset-0 z-[60] grid place-items-center bg-black/40 backdrop-blur-sm px-6"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xs bg-card rounded-3xl outline-1 outline-black/5 p-5 space-y-4 shadow-xl"
      >
        <div className="flex items-start gap-3">
          <div className={`size-10 rounded-2xl grid place-items-center shrink-0 ${destructive ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"}`}>
            <AlertTriangle className="size-5" />
          </div>
          <div className="space-y-1 min-w-0">
            <h2 id="confirm-title" className="font-bold text-sm" style={{ fontFamily: "var(--font-display)" }}>
              {title}
            </h2>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-full bg-muted text-foreground text-xs font-semibold hover:bg-muted/70 transition"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition ${destructive ? "bg-destructive text-destructive-foreground hover:opacity-90" : "bg-primary text-primary-foreground hover:opacity-90"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}