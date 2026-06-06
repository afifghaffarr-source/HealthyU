import { useEffect, useState } from "react";
import { Keyboard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SHORTCUTS: Array<{ keys: string[]; label: string }> = [
  { keys: ["⌘/Ctrl", "K"], label: "Buka pencarian cepat" },
  { keys: ["G", "D"], label: "Pergi ke Dashboard" },
  { keys: ["G", "F"], label: "Pergi ke Catatan Makan" },
  { keys: ["G", "P"], label: "Pergi ke Progres" },
  { keys: ["G", "C"], label: "Pergi ke AI Coach" },
  { keys: ["?"], label: "Tampilkan pintasan ini" },
  { keys: ["Esc"], label: "Tutup dialog/menu" },
];

/**
 * Press "?" anywhere (outside text inputs) to open this dialog.
 * Lightweight help for power users — does not register the shortcuts itself.
 */
export function KeyboardShortcutsDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "?" || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable)
        return;
      e.preventDefault();
      setOpen((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" aria-hidden="true" />
            Pintasan Keyboard
          </DialogTitle>
          <DialogDescription>Navigasi lebih cepat tanpa lepas dari keyboard.</DialogDescription>
        </DialogHeader>
        <ul className="mt-2 space-y-2">
          {SHORTCUTS.map((s) => (
            <li
              key={s.label}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2"
            >
              <span className="text-sm text-foreground">{s.label}</span>
              <span className="flex items-center gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="rounded-md border border-border bg-background px-2 py-0.5 text-xs font-mono text-muted-foreground shadow-sm"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Tekan{" "}
          <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono">
            ?
          </kbd>{" "}
          kapan saja untuk membuka panel ini.
        </p>
      </DialogContent>
    </Dialog>
  );
}
