import { toast } from "@/lib/toast-config";
import { useState } from "react";

export function FreezeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [freezeUsed, setFreezeUsed] = useState(false);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4" onClick={onClose}>
      <div
        className="bg-card rounded-3xl p-6 max-w-sm w-full text-center space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-6xl">🧊</div>
        <h3 className="font-bold text-lg">Streak Freeze</h3>
        <p className="text-sm text-muted-foreground">
          Lupa log hari ini? Gunakan 1 freeze untuk menyelamatkan streakmu.
        </p>
        <button
          onClick={() => {
            setFreezeUsed(true);
            toast.success("Freeze digunakan untuk hari ini");
            setTimeout(onClose, 600);
          }}
          disabled={freezeUsed}
          className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          {freezeUsed ? "✓ Freeze Digunakan" : "Gunakan 1 Freeze"}
        </button>
        <button onClick={onClose} className="w-full text-xs text-muted-foreground">
          Tutup
        </button>
      </div>
    </div>
  );
}
