import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "healthyu-install-dismissed";

export function InstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari
      window.navigator.standalone === true;
    if (isStandalone) return;
    if (localStorage.getItem(DISMISS_KEY)) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  };

  const install = async () => {
    if (!evt) return;
    await evt.prompt();
    await evt.userChoice;
    setShow(false);
    setEvt(null);
  };

  if (!show) return null;

  // Lapisan tipis ini TIDAK boleh menahan klik dari konten di belakangnya.
  // Wrapper luar = pointer-events-none (transparan untuk klik) supaya form
  // submit & button di belakang banner tidak terblokir. Hanya kartu banner
  // yang punya pointer-events-auto, jadi klik di area kosong di luar kartu
  // otomatis jatuh ke konten di bawahnya.
  return (
    <div
      data-testid="install-prompt-overlay"
      className="fixed inset-x-0 bottom-20 z-50 pointer-events-none flex justify-center px-4"
    >
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-xl p-3 flex items-center gap-2 animate-fade-up pointer-events-auto">
        <div className="size-9 rounded-xl bg-primary/15 text-primary grid place-items-center shrink-0">
          <Download className="size-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">Install HealthyU</p>
          <p className="text-[11px] text-muted-foreground leading-tight">
            Akses cepat dari home screen.
          </p>
        </div>
        <button
          type="button"
          onClick={install}
          className="text-xs font-semibold bg-primary text-primary-foreground px-3 py-1.5 rounded-lg"
        >
          Install
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Tutup"
          className="size-7 grid place-items-center text-muted-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
